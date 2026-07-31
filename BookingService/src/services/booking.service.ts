import { serverConfig } from "../config/index";
import { redisClient, redlock, } from '../config/redis.config';
import { CreateBookingDTO } from '../dto/booking.dto';
import { prisma, Prisma } from "../lib/prisma";
import { conflictBooking, createBookingRecord, createIdempotencyKey, getAllBookings, getBookingById, getBookingsByHotelId, getBookingsByUserId, getCompletedBookingsByUserId, getIdempotencyKey, insertOutboxEvent, PaginationParams } from "../repositories/booking.repository";
import { BadRequestError, NotFoundError } from "../utils/errors/app.error";
import logger from "../config/logger";
import { BOOKING_CREATED_EVENT, BOOKING_CANCELLED_EVENT, BOOKING_STAY_COMPLETED_EVENT } from "../producers/booking-producer";
import crypto from "crypto";
import { anyDateOccupied, placeHold, releaseDates, syncConflictToCache, getDatesInRange } from "../utils/availabilityCache";
import { getRoomPricePerNight } from "../utils/roompriceHelper";

const BOOKING_HOLD_MS = 15 * 60 * 1000; // 15 minutes

const MAX_DEADLOCK_RETRIES = 3;

function isDeadlockError(error: unknown): boolean {
    const message = (error as Error)?.message || "";
    const code = (error as any)?.code;
    return code === "P2034" || code === "P2010" || message.includes("1213") || message.includes("deadlock");
}

async function retryOnDeadlock<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= MAX_DEADLOCK_RETRIES; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (isDeadlockError(error) && attempt < MAX_DEADLOCK_RETRIES) {
                logger.warn("Deadlock detected, retrying transaction", { attempt });
                await new Promise((resolve) => setTimeout(resolve, attempt * 50));
                continue;
            }
            throw error;
        }
    }
    throw new Error("Unreachable");
}


export async function createBookingService({ createBookingDTO, userId, userEmail, idempotencyKey }: { createBookingDTO: CreateBookingDTO, userId: number, userEmail: string, idempotencyKey?: string }) {

    // Step 0: Idempotency check — return existing booking if key matches
    if (idempotencyKey) {
        const existing = await getIdempotencyKey(idempotencyKey);
        if (existing) {
            logger.info("Idempotency key found, returning existing booking", { idempotencyKey, bookingId: existing.bookingId });
            return {
                bookingId: existing.bookingId,
                idempotencyKey: idempotencyKey,
                expiresAt: existing.booking.expiresAt,
                duplicated: true,
            };
        }
    }

    const ttl = serverConfig.REDLOCK_TTL;
    const bookingResource = `hotel:${createBookingDTO.hotelId}:room:${createBookingDTO.roomId}`;
    let lock: any

    try {
        lock = await redlock.acquire([bookingResource], ttl);
        logger.info("Acquired lock on booking resource", { bookingResource });

        const nights = getDatesInRange(createBookingDTO.checkIn, createBookingDTO.checkOut).length;
        if (nights < 1) {
            throw new BadRequestError("Check-out date must be after check-in date");
        }
        const pricePerNight = await getRoomPricePerNight(createBookingDTO.hotelId, createBookingDTO.roomId, userId);
        const bookingAmount = pricePerNight * nights;

        // Step 1: Check Redis cache for date conflicts (fast path)
        const occupied = await anyDateOccupied(redisClient, createBookingDTO.hotelId, createBookingDTO.roomId, createBookingDTO.checkIn, createBookingDTO.checkOut);
        if (occupied) {
            logger.info("Redis cache hit: room unavailable", { hotelId: createBookingDTO.hotelId, roomId: createBookingDTO.roomId });
            throw new BadRequestError("Selected room is not available for the chosen dates");
        }

        return await retryOnDeadlock(async () => {
            return await prisma.$transaction(
                async (tx: any) => {
                    // Step 2: Check user :  already having  PENDING booking for same dates
                    const existingUserBooking = await tx.$queryRaw`
                        SELECT id FROM booking
                        WHERE userId = ${userId}
                          AND hotelId = ${createBookingDTO.hotelId}
                          AND roomId = ${createBookingDTO.roomId}
                          AND checkIn < ${new Date(createBookingDTO.checkOut)}
                          AND checkOut > ${new Date(createBookingDTO.checkIn)}
                          AND status = 'PENDING'
                          AND expiresAt > ${new Date()}
                        LIMIT 1
                    `;
                    if (existingUserBooking.length > 0) {
                        throw new BadRequestError("You already have a pending booking for these dates");
                    }

                    // Step 3: DB conflict check with FOR UPDATE
                    const conflictingBooking = await conflictBooking(tx, createBookingDTO)
                    if (conflictingBooking) {
                        // Update Redis cache to reflect DB state
                        await syncConflictToCache(
                            redisClient,
                            createBookingDTO.hotelId,
                            createBookingDTO.roomId,
                            createBookingDTO.checkIn,
                            createBookingDTO.checkOut,
                            conflictingBooking
                        );
                        throw new BadRequestError("Selected room is not available for the chosen dates");
                    }

                    // Step 4: Create booking (15 min hold)
                    const booking = await createBookingRecord(tx, {
                        userId: userId,
                        userEmail: userEmail,
                        hotelId: createBookingDTO.hotelId,
                        roomId: createBookingDTO.roomId,
                        totalGuests: createBookingDTO.totalGuests!,
                        bookingAmount: bookingAmount,
                        checkIn: new Date(createBookingDTO.checkIn),
                        checkOut: new Date(createBookingDTO.checkOut),
                        expiresAt: new Date(Date.now() + BOOKING_HOLD_MS)
                    });

                    // Step 5: Store idempotency key
                    const key = idempotencyKey || crypto.randomUUID();
                    await createIdempotencyKey(tx, key, booking.id);

                    // Step 5: Emit outbox event
                    await insertOutboxEvent(tx, BOOKING_CREATED_EVENT, {
                        bookingId: booking.id,
                        userId: booking.userId,
                        hotelId: booking.hotelId,
                        roomId: booking.roomId,
                        checkIn: booking.checkIn.toISOString(),
                        checkOut: booking.checkOut.toISOString(),
                        bookingAmount: booking.bookingAmount,
                        totalGuests: booking.totalGuests,
                        userEmail: userEmail,
                        createdAt: booking.createdAt.toISOString(),
                    });

                    // Step 6: Update Redis cache with booked dates + TTL
                    await placeHold(redisClient, 
                        createBookingDTO.hotelId, 
                        createBookingDTO.roomId, booking.id, 
                        createBookingDTO.checkIn, 
                        createBookingDTO.checkOut, 
                        booking.expiresAt);

                    logger.info("Booking created with idempotency key", { bookingId: booking.id, idempotencyKey: key });

                    return {
                        bookingId: booking.id,
                        idempotencyKey: key,
                        expiresAt: booking.expiresAt,
                        duplicated: false,
                    };
                },
                { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
            );
        });

    } catch (error) {
        logger.error("Booking service failed", { error: (error as Error).message });
        throw error
    } finally {
        if (lock) {
            try {
                await lock.unlock();
                logger.info("Released lock on booking resource", { bookingResource });
            } catch (error) {
                logger.error("Failed to release lock for booking resource", { bookingResource, error: (error as Error).message });
            }
        }
    }
}

//removed epxirestalebooking lazy expiry on fetch 
export async function getAllBookingsService(pagination?: PaginationParams) {
    console.log("Fetching all bookings for admin in service", { pagination });
    return await getAllBookings(pagination);
}

export async function getBookingsByUserService(userId: number, pagination?: PaginationParams) {
    console.log("Fetching bookings for user in service", { userId, pagination });

    const completedBookings = await getCompletedBookingsByUserId(userId);
    if (completedBookings.length > 0) {
        for (const booking of completedBookings) {
            try {
                await prisma.$transaction(async (tx: any) => {
                    // Atomic claim: only proceeds if not already emitted.
                    // updateMany returns count=0 if another request already claimed it.
                    const claimed = await tx.booking.updateMany({
                        where: { id: booking.id, stayCompletedEmittedAt: null },
                        data: { stayCompletedEmittedAt: new Date() },
                    });
                    if (claimed.count === 0) return; // already emitted, skip

                    await insertOutboxEvent(tx, BOOKING_STAY_COMPLETED_EVENT, {
                        bookingId: booking.id,
                        userId: booking.userId,
                        hotelId: booking.hotelId,
                        roomId: booking.roomId,
                    });
                });
            } catch (err) {
                logger.error("Failed to emit stay-completed event", { bookingId: booking.id, error: (err as Error).message });
            }
        }
        logger.info("Checked stay-completed events", { count: completedBookings.length, userId });
    }
    return await getBookingsByUserId(userId, pagination);
}

export async function getBookingsByHotelService(hotelId: number, pagination?: PaginationParams) {
    console.log("Fetching bookings for hotel in service", { hotelId, pagination });
    // await expireStaleBookings();removed this lazy expiry
    return await getBookingsByHotelId(hotelId, pagination);
}

export async function getBookingByIdService(bookingId: number) {
    console.log("Fetching booking by ID in service", { bookingId });
    // await expireStaleBookings();
    const booking = await getBookingById(bookingId);
    if (!booking) {
        throw new NotFoundError("Booking not found");
    }
    return booking;
}


//logic :
//validations of booking status
// remove room availability from redis cache 
//insert into outbox table for booking cancelled event
//return updated booking

//payment service : 
//no payment found :-> ack done 
//payment Found : 
//       status : created -> order exists -> order auto expires and ack done 
//       status : captured-> refund payment and ack done
//       status : refunded/cancelled -> ack , already handled 

//if refund initiated : 

export async function cancelBookingService(bookingId: number, userId: number, userEmail: string) {
    logger.info("Cancelling booking in service", { bookingId, userId });
    return await prisma.$transaction(async (tx: any) => {
        const booking = await tx.booking.findUnique({
            where: { id: bookingId }
        });

        if (!booking) {
            throw new NotFoundError("Booking not found");
        }

        if (booking.status === 'CONFIRMED' && new Date(booking.checkOut) < new Date()) {
            throw new BadRequestError("Cannot cancel a booking after check out Date");
        }

        if (booking.userId !== userId) {
            throw new BadRequestError("You are not authorized to cancel this booking");
        }

        if (booking.status === 'CANCELLED') {
            throw new BadRequestError("Booking is already cancelled");
        }

        if (booking.status === 'EXPIRED') {
            throw new BadRequestError("Booking has expired and cannot be cancelled");
        }

        const updatedBooking = await tx.booking.update({
            where: { id: bookingId },
            data: { status: "CANCELLED" },
        });

        // Remove booked dates from Redis cache
        try {
            await releaseDates(redisClient, booking.hotelId, booking.roomId, booking.checkIn, booking.checkOut);
        } catch (redisErr) {
            logger.error("Failed to invalidate Redis cache on cancel", { error: (redisErr as Error).message });
        }

        await insertOutboxEvent(tx, BOOKING_CANCELLED_EVENT, {
            bookingId: updatedBooking.id,
            userId: updatedBooking.userId,
            hotelId: updatedBooking.hotelId,
            roomId: updatedBooking.roomId,
            userEmail: userEmail,
            status: "CANCELLED",
            reason: "User cancelled",
        });

        logger.info("Booking cancelled and outbox event created", { bookingId });
        return updatedBooking;
    });
}

export async function checkAvailabilityService(data: {
    hotelId: number;
    roomId: number;
    checkIn: string;
    checkOut: string;
}) {
    logger.info("Checking availability in service", { hotelId: data.hotelId, roomId: data.roomId, checkIn: data.checkIn, checkOut: data.checkOut });

    const occupied = await anyDateOccupied(redisClient, data.hotelId, data.roomId, data.checkIn, data.checkOut);
    if (occupied) {
        logger.info("Redis cache hit: room unavailable", { hotelId: data.hotelId, roomId: data.roomId });
        throw new BadRequestError("Selected room is not available for chosen dates");
    }

    const conflict = await conflictBooking(prisma, {
        hotelId: data.hotelId,
        roomId: data.roomId,
        checkIn: new Date(data.checkIn),
        checkOut: new Date(data.checkOut),
    });

    if (conflict) {
        // Sync Redis 
        await syncConflictToCache(redisClient, data.hotelId, data.roomId, data.checkIn, data.checkOut, conflict);
        throw new BadRequestError("Selected room is not available for the chosen dates");
    }
    return { available: true };
}
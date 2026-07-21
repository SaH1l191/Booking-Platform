import { serverConfig } from "../config/index";
import { redisClient, redlock, } from '../config/redis.config';
import { CreateBookingDTO } from '../dto/booking.dto';
import { prisma } from "../lib/prisma";
import {conflictBooking, createBookingRecord, createIdempotencyKey, expireStaleBookings, getAllBookings, getBookingById, getBookingsByHotelId, getBookingsByUserId, getCompletedBookingsByUserId, getIdempotencyKey, insertOutboxEvent } from "../repositories/booking.repository";
import { BadRequestError, NotFoundError } from "../utils/errors/app.error";
import logger from "../config/logger";
import { BOOKING_CREATED_EVENT, BOOKING_CANCELLED_EVENT, BOOKING_STAY_COMPLETED_EVENT } from "../producers/booking-producer";

const BOOKING_HOLD_MS = 15 * 60 * 1000; // 15 minutes
const REDIS_TTL_BUFFER_S = 3600; // 1 hour buffer after checkout

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

        // Step 1: Check Redis cache for date conflicts (fast path)
        const redisKey = `room_availability:hotel:${createBookingDTO.hotelId}:room:${createBookingDTO.roomId}`;
        const startDate = new Date(createBookingDTO.checkIn);
        const endDate = new Date(createBookingDTO.checkOut);

        for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
            const date = d.toISOString().split("T")[0];
            const exists = await redisClient.sismember(redisKey, date);
            if (exists) {
                logger.info("Redis cache hit: room unavailable", { redisKey, date });
                throw new BadRequestError("Selected room is not available for the chosen dates");
            }
        }

        return await prisma.$transaction(
            async (tx: any) => {
                // Step 2: DB conflict check with FOR UPDATE
                const conflictingBooking = await conflictBooking(tx, createBookingDTO)
                if (conflictingBooking) {
                    // Update Redis cache to reflect DB state
                    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
                        const date = d.toISOString().split("T")[0];
                        await redisClient.sadd(redisKey, date);
                    }
                    throw new BadRequestError("Selected room is not available for the chosen dates");
                }

                // Step 3: Create booking (15 min hold)
                const booking = await createBookingRecord(tx, {
                    userId: userId,
                    userEmail: userEmail,
                    hotelId: createBookingDTO.hotelId,
                    roomId: createBookingDTO.roomId,
                    totalGuests: createBookingDTO.totalGuests!,
                    bookingAmount: createBookingDTO.bookingAmount!,
                    checkIn: new Date(createBookingDTO.checkIn),
                    checkOut: new Date(createBookingDTO.checkOut),
                    expiresAt: new Date(Date.now() + BOOKING_HOLD_MS)
                });

                // Step 4: Store idempotency key
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
                for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
                    const date = d.toISOString().split("T")[0];
                    await redisClient.sadd(redisKey, date);
                }
                const ttlSeconds = Math.ceil((endDate.getTime() - Date.now()) / 1000) + REDIS_TTL_BUFFER_S;
                await redisClient.expire(redisKey, ttlSeconds);

                logger.info("Booking created with idempotency key", { bookingId: booking.id, idempotencyKey: key });

                return {
                    bookingId: booking.id,
                    idempotencyKey: key,
                    expiresAt: booking.expiresAt,
                    duplicated: false,
                };
            }
        )

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

export async function getAllBookingsService() {
    logger.info("Fetching all bookings for admin in service");
    await expireStaleBookings();
    return await getAllBookings();
}

export async function getBookingsByUserService(userId: number) {
    logger.info("Fetching bookings for user in service", { userId });
    await expireStaleBookings();

    const completedBookings = await getCompletedBookingsByUserId(userId);
    if (completedBookings.length > 0) {
        for (const booking of completedBookings) {
            await prisma.$transaction(async (tx: any) => {
                await insertOutboxEvent(tx, BOOKING_STAY_COMPLETED_EVENT, {
                    bookingId: booking.id,
                    userId: booking.userId,
                    hotelId: booking.hotelId,
                    roomId: booking.roomId,
                });
            });
        }
        logger.info("Emitted BOOKING_STAY_COMPLETED events", { count: completedBookings.length, userId });
    }
    logger.info("Fetching bookings for user in service", { userId });
    return await getBookingsByUserId(userId);
}

export async function getBookingsByHotelService(hotelId: number) {
    logger.info("Fetching bookings for hotel in service", { hotelId });
    await expireStaleBookings();
    return await getBookingsByHotelId(hotelId);
}

export async function getBookingByIdService(bookingId: number) {
    logger.info("Fetching booking by ID in service", { bookingId });
    await expireStaleBookings();
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

        if(booking.status === 'CONFIRMED' && new Date(booking.checkOut) < new Date()) {
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
            const redisKey = `room_availability:hotel:${booking.hotelId}:room:${booking.roomId}`;
            const startDate = new Date(booking.checkIn);
            const endDate = new Date(booking.checkOut);
            const dates: string[] = [];
            for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
                dates.push(d.toISOString().split("T")[0]);
            }
            if (dates.length > 0) {
                await redisClient.srem(redisKey, ...dates);
            }
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
    const redisKey = `room_availability:hotel:${data.hotelId}:room:${data.roomId}`;
    const startDate = new Date(data.checkIn);
    const endDate = new Date(data.checkOut);

    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
        const date = d.toISOString().split("T")[0];

        const exists = await redisClient.sismember(redisKey, date);
        if (exists) {
            logger.info("Redis cache hit: room unavailable", { redisKey, date });
            throw new BadRequestError("Selected room is not available for chosen dates");
        }
    }

    const conflict = await conflictBooking(prisma, {
        hotelId: data.hotelId,
        roomId: data.roomId,
        checkIn: new Date(data.checkIn),
        checkOut: new Date(data.checkOut),
    });

    if (conflict) {
        // Sync Redis 
        for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
            const date = d.toISOString().split("T")[0];
            await redisClient.sadd(redisKey, date);
        }
        throw new BadRequestError("Selected room is not available for the chosen dates");
    }
    return { available: true };
}

import { serverConfig } from "../config/index";
import { redisClient, redlock, } from '../config/redis.config';
import { CreateBookingDTO } from '../dto/booking.dto';
import { prisma } from "../lib/prisma";
import {checkHotelRoomAvailability, conflictBooking, createBookingRecord, createIdempotencyKey, getBookingById, getBookingsByHotelId, getBookingsByUserId, insertOutboxEvent } from "../repositories/booking.repository";
import { BadRequestError, NotFoundError } from "../utils/errors/app.error";
import { generateIdempotencyKey } from "../utils/generateIdempotencyKey";
import logger from "../config/logger";
import { BOOKING_CREATED_EVENT, BOOKING_CANCELLED_EVENT } from "../producers/booking-producer";

export async function createBookingService({ createBookingDTO, userId, userEmail }: { createBookingDTO: CreateBookingDTO, userId: number, userEmail: string }) {

    const ttl = serverConfig.REDLOCK_TTL;
    const bookingResource = `hotel:${createBookingDTO.hotelId}:room${createBookingDTO.roomId}`;
    let lock: any

    try {
        lock = await redlock.acquire([bookingResource], ttl);
        logger.info("Acquired lock on booking resource", { bookingResource });

        return await prisma.$transaction(
            async (tx: any) => {
                //cache chcek to reduce database load
                const conflictingBooking = await conflictBooking(tx, createBookingDTO)
                if (conflictingBooking) {
                    logger.info("Conflicting booking found for dates", { hotelId: createBookingDTO.hotelId, roomId: createBookingDTO.roomId });
                    throw new BadRequestError("Selected room is not available for the chosen dates");
                }

                const booking = await createBookingRecord(tx, {
                    userId: userId,
                    userEmail: userEmail,
                    hotelId: createBookingDTO.hotelId,
                    roomId: createBookingDTO.roomId,
                    totalGuests: createBookingDTO.totalGuests,
                    bookingAmount: createBookingDTO.bookingAmount,
                    checkIn: new Date(createBookingDTO.checkIn),
                    checkOut: new Date(createBookingDTO.checkOut),
                    expiresAt: new Date(
                        Date.now() + serverConfig.BOOKING_EXPIRY_MS
                    )
                });

                const idempotencyKey = await generateIdempotencyKey();
                await createIdempotencyKey(tx, idempotencyKey, booking.id);

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
                });

                logger.info("Booking record, idempotency key, and outbox event created", { bookingId: booking.id, idempotencyKey });

                return {
                    bookingId: booking.id,
                    idempotencyKey: idempotencyKey,
                    expiresAt: booking.expiresAt,
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

export async function getBookingsByUserService(userId: number) {
    logger.info("Fetching bookings for user in service", { userId });
    return await getBookingsByUserId(userId);
}

export async function getBookingsByHotelService(hotelId: number) {
    logger.info("Fetching bookings for hotel in service", { hotelId });
    return await getBookingsByHotelId(hotelId);
}

export async function getBookingByIdService(bookingId: number) {
    logger.info("Fetching booking by ID in service", { bookingId });
    const booking = await getBookingById(bookingId);
    if (!booking) {
        throw new NotFoundError("Booking not found");
    }
    return booking;
}

export async function cancelBookingService(bookingId: number, userId: number, userEmail: string) {
    logger.info("Cancelling booking in service", { bookingId, userId });
    return await prisma.$transaction(async (tx: any) => {
        const booking = await tx.booking.findUnique({
            where: { id: bookingId }
        });

        if (!booking) {
            throw new NotFoundError("Booking not found");
        }

        if (booking.userId !== userId) {
            throw new BadRequestError("You are not authorized to cancel this booking");
        }

        if (booking.status === 'CANCELLED') {
            throw new BadRequestError("Booking is already cancelled");
        }

        const updatedBooking = await tx.booking.update({
            where: { id: bookingId },
            data: { status: "CANCELLED" },
        });

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
    const redisKey = `room_availability:hotel:${data.hotelId}` + `:room:${data.roomId}`;
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

    const conflictBooking = await checkHotelRoomAvailability(data);
    if (conflictBooking) {
        logger.info("Conflicting booking found for dates", { hotelId: data.hotelId, checkIn: data.checkIn, checkOut: data.checkOut });
        throw new BadRequestError("Selected room is not available for the chosen dates");
    }
    return { available: true };
}

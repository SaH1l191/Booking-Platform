import { serverConfig } from "../config/index";
import { redisClient, redlock } from '../config/redis.config';
import { CreateBookingDTO } from '../dto/booking.dto';
import { prisma } from "../lib/prisma";
import { cancelBooking, checkHotelRoomAvailability, confirmBooking, conflictBooking, createBookingRecord, createIdempotencyKey, finalizeIdempotencyKey, getBookingById, getBookingsByHotelId, getBookingsByUserId, getIdempotencyKey } from "../repositories/booking.repository";
import { BadRequestError, NotFoundError } from "../utils/errors/app.error";
import { generateIdempotencyKey } from "../utils/generateIdempotencyKey";
import logger from "../config/logger";
import { date } from "zod/v4/mini";

//usera,userb books hotel -> usera hits first then lock it for 4minutes for usera to perform booking 
export async function createBookingService({ createBookingDTO, userId }: { createBookingDTO: CreateBookingDTO, userId: number }) {


    const ttl = serverConfig.REDLOCK_TTL;
    const bookingResource = `hotel:${createBookingDTO.hotelId}:room${createBookingDTO.roomId}`;
    // Unique resource identifier:hotel room
    let lock: any

    try {
        lock = await redlock.acquire([bookingResource], ttl);
        logger.info("Acquired lock on Booking resource : ", { bookingResource });

        return await prisma.$transaction(
            async (tx: any) => {



                //1.query hotel-ROOM Availability [level- 1]    


                //2.if available -> booking queries its own availability [level-2] and creates booking  


                //existingCheckout <= newCheckin OR existingCheckin >= newCheckout  ( non overlapping condition)
                // overlapping condition : existingCheckin < newCheckout AND existingCheckout > newCheckin (demorgans law)
                const conflictingBooking = await conflictBooking(tx, createBookingDTO)
                if (conflictingBooking) {
                    logger.info("Conflicting booking found for dates", { createBookingDTO });
                    throw new BadRequestError("Selected room is not available for the chosen dates");
                }

                const booking = await createBookingRecord(tx, {
                    userId: userId,
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

                logger.info("Booking record and idempotency key created", { bookingId: booking.id, idempotencyKey });

                return {
                    bookingId: booking.id,
                    idempotencyKey: idempotencyKey,
                };

            }
        )

    } catch (error) {
        logger.error("Booking service failed:", error);
        throw error
    } finally {
        if (lock) {
            try {
                // depending on redlock version the method may be `unlock` instead of `release`
                // if (typeof lock.unlock === 'function') {
                await lock.unlock();
                // } 
                logger.info("Released lock on Booking resource : ", { bookingResource });
            } catch (error) {
                logger.error("Failed to release lock for booking resource : ", { bookingResource, error });
            }
        }
    }
}

export async function confirmBookingService(idempotencyKey: string) {
    logger.info(`Service: Confirming booking with idempotencyKey: ${idempotencyKey}`);
    return await prisma.$transaction(async (tx: any) => {
        const idempotencyKeyData = await getIdempotencyKey(tx, idempotencyKey);

        if (!idempotencyKeyData || !idempotencyKeyData.bookingId) {
            logger.info("Invalid idempotency key", { idempotencyKey });
            throw new NotFoundError("Invalid idempotency key");
        }
        if (idempotencyKeyData.finalized) {
            logger.info("Idempotency key already finalized", { idempotencyKey });
            throw new BadRequestError("Idempotency key already finalized");
        }
        const booking = await tx.booking.findUnique({
            where: {
                id: idempotencyKeyData.bookingId
            }
        });

        if (!booking) {
            logger.info("Booking not found for idempotency key", { idempotencyKey, bookingId: idempotencyKeyData.bookingId });
            throw new NotFoundError(
                "Booking not found"
            );
        }

        if (booking.status === "PENDING" && booking.expiresAt && booking.expiresAt < new Date()) {
            logger.info("Booking session expired", { bookingId: booking.id });
            throw new BadRequestError("Booking session expired");
        }

        const confirmedBooking = await confirmBooking(tx, booking.id);
        await finalizeIdempotencyKey(tx, idempotencyKey);

        logger.info("Booking confirmed and idempotency key finalized", { bookingId: booking.id, idempotencyKey });
        logger.info("confirmedBooking details", { bookingId: confirmedBooking.id, hotelId: confirmedBooking.hotelId, roomId: confirmedBooking.roomId, checkIn: confirmedBooking.checkIn, checkOut: confirmedBooking.checkOut });

        try {
            const redisKey = `room_availability:hotel:${confirmedBooking.hotelId}` + `:room:${confirmedBooking.roomId}`;

            const dates: string[] = [];
            const startDate = new Date(confirmedBooking.checkIn);
            const endDate = new Date(confirmedBooking.checkOut);

            // [checkIn, checkOut)
            for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
                dates.push(d.toISOString().split("T")[0]);
            }

            if (dates.length > 0) {
                await redisClient.sadd(redisKey, ...dates);
                logger.info("Availability cache updated", { redisKey, dates, });
            }
        } catch (redisError) {
            logger.error("Failed to update availability cache", redisError);
            logger.info("Booking confirmed and idempotency key finalized", { bookingId: booking.id, idempotencyKey });
        }
        
        return confirmedBooking;
    })
}

export async function getBookingsByUserService(userId: number) {
    logger.info(`Service: Fetching bookings for user: ${userId}`);
    return await getBookingsByUserId(userId);
}

export async function getBookingsByHotelService(hotelId: number) {
    logger.info(`Service: Fetching bookings for hotel: ${hotelId}`);
    return await getBookingsByHotelId(hotelId);
}

export async function getBookingByIdService(bookingId: number) {
    logger.info(`Service: Fetching booking by id: ${bookingId}`);
    const booking = await getBookingById(bookingId);
    if (!booking) {
        throw new NotFoundError("Booking not found");
    }
    return booking;
}

export async function cancelBookingService(bookingId: number, userId: number) {
    logger.info(`Service: Cancelling booking: ${bookingId} for user: ${userId}`);
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

        return await cancelBooking(tx, bookingId);
    });
}

export async function checkAvailabilityService(data: {
    hotelId: number;
    roomId: number;
    checkIn: string;
    checkOut: string;
}) {
    logger.info(`Checking availability for hotel: ${data.hotelId}, check-in: ${data.checkIn}, check-out: ${data.checkOut}`);
    const redisKey = `room_availability:hotel:${data.hotelId}` + `:room:${data.roomId}`;
    const startDate = new Date(data.checkIn);
    const endDate = new Date(data.checkOut);

    // [checkIn, checkOut)
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
        const date = d.toISOString().split("T")[0];

        const exists = await redisClient.sismember(redisKey, date);
        if (exists) {
            logger.info("Redis cache hit: room unavailable", { redisKey, date, });
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
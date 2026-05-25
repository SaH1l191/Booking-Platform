import { serverConfig } from "../config/index.js";
import { redlock } from '../config/redis.config';
import { CreateBookingDTO } from "../dto/booking.dto.js";
import { prisma } from "../lib/prisma.js";
import { confirmBooking, conflictBooking, createBookingRecord, createIdempotencyKey, finalizeIdempotencyKey, getIdempotencyKey } from "../repositories/booking.repository.js";
import { BadRequestError, InternalServerError, NotFoundError } from "../utils/errors/app.error.js";
import { generateIdempotencyKey } from "../utils/generateIdempotencyKey.js";



//usera,userb books hotel -> usera hits first then lock it for 4minutes for usera to perform booking 
export async function createBookingService(
    createBookingDTO: CreateBookingDTO
) {

    const ttl = serverConfig.LOCK_TTL;
    const bookingResource = `hotel:${createBookingDTO.hotelId}:room${createBookingDTO.roomId}`;
    // Unique resource identifier:hotel room
    let lock: any

    try { 
        lock = await redlock.acquire([bookingResource], ttl);
        console.log("Acquired lock on Booking resource : ", bookingResource);

        return await prisma.$transaction(
            async (tx: any) => {

                //existingCheckout <= newCheckin OR existingCheckin >= newCheckout  ( non overlapping condition)
                // overlapping condition : existingCheckin < newCheckout AND existingCheckout > newCheckin (demorgans law)
                const conflictingBooking = await conflictBooking(tx, createBookingDTO)
                if (conflictingBooking) {
                    throw new BadRequestError("Selected room is not available for the chosen dates");
                }

                const booking = await createBookingRecord(tx, {
                    userId: createBookingDTO.userId,
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

                return {
                    bookingId: booking.id,
                    idempotencyKey: idempotencyKey,
                };

            }
        )

    } catch (error) {
        console.error("Booking service failed:", error);
        throw error
    } finally {
        if (lock) {
            try {
                // depending on redlock version the method may be `unlock` instead of `release`
                if (typeof lock.unlock === 'function') {
                    await lock.unlock();
                } else if (typeof lock.release === 'function') {
                    await lock.release();
                }
            } catch (error) {
                console.error("Failed to release lock for booking resource : ", bookingResource, "Error : ", error);
            }
        }
    }
}

export async function confirmBookingService(idempotencyKey: string) {

    return await prisma.$transaction(async (tx: any) => {
        const idempotencyKeyData = await getIdempotencyKey(tx, idempotencyKey);

        if (!idempotencyKeyData || !idempotencyKeyData.bookingId) {
            throw new NotFoundError("Invalid idempotency key");
        }
        if (idempotencyKeyData.finalized) {
            throw new BadRequestError("Idempotency key already finalized");
        }
        const booking =
            await tx.booking.findUnique({
                where: {
                    id:
                        idempotencyKeyData.bookingId
                }
            });

        if (!booking) {
            throw new NotFoundError(
                "Booking not found"
            );
        }

        if (
            booking.status ===
            "PENDING" &&
            booking.expiresAt &&
            booking.expiresAt <
            new Date()
        ) {
            throw new BadRequestError(
                "Booking session expired"
            );
        }

        const confirmedBooking =
            await confirmBooking(
                tx,
                booking.id
            );
        await finalizeIdempotencyKey(tx, idempotencyKey);
        return confirmedBooking;
    })
}
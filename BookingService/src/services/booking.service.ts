import { serverConfig } from "../config";
import { redlock } from '../config/redis.config';
import { CreateBookingDTO } from "../dto/booking.dto";
import { prisma } from "../prisma/client";
import { confirmBooking, conflictBooking, createBookingRecord, createIdempotencyKey, finalizeIdempotencyKey, getIdempotencyKey } from "../repositories/booking.repository";
import { BadRequestError, InternalServerError, NotFoundError } from "../utils/errors/app.error";
import { generateIdempotencyKey } from "../utils/generateIdempotencyKey";
import { Prisma } from "@prisma/client";


//usera,userb books hotel -> usera hits first then lock it for 4minutes for usera to perform booking 
export async function createBookingService(
    createBookingDTO: CreateBookingDTO
) {

    const ttl = serverConfig.LOCK_TTL;
    const bookingResource = `hotel:${createBookingDTO.hotelId}:room${createBookingDTO.roomId}`; 
    // Unique resource identifier:hotel room
    let lock

    try {
        lock = await redlock.acquire([bookingResource], ttl);
        console.log("Acquired lock on Booking resource : ", bookingResource);
 
        return await prisma.$transaction(
            async (tx: Prisma.TransactionClient) => {

                //existingCheckout <= newCheckin OR existingCheckin >= newCheckout  ( non overlapping condition)
                // overlapping condition : existingCheckin < newCheckout AND existingCheckout > newCheckin (demorgans law)
                const conflictingBooking = await conflictBooking(tx,createBookingDTO)
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
                });

                const idempotencyKey = await generateIdempotencyKey();
                await createIdempotencyKey(tx,idempotencyKey, booking.id);

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
                await lock.release();
            } catch (error) {
                console.error("Failed to release lock for booking resource : ", bookingResource, "Error : ", error);
            }
        }
    }
}

export async function confirmBookingService(idempotencyKey: string) {

    return await prisma.$transaction(async (tx) => {
        const idempotencyKeyData = await getIdempotencyKey(tx, idempotencyKey);

        if (!idempotencyKeyData || !idempotencyKeyData.bookingId) {
            throw new NotFoundError("Invalid idempotency key");
        }
        if (idempotencyKeyData.finalized) {
            throw new BadRequestError("Idempotency key already finalized");
        }
        const booking = await confirmBooking(tx, idempotencyKeyData.bookingId);
        await finalizeIdempotencyKey(tx, idempotencyKey);
        return booking;
    })
}
import { serverConfig } from "../config";
import { redlock } from "../config/redis.config";
import { CreateBookingDTO } from "../dto/booking.dto";
import { prisma } from "../prisma/client";
import { confirmBooking, createBooking, createIdempotencyKey, finalizeIdempotencyKey, getIdempotencyKey } from "../repositories/booking.repository";
import { BadRequestError, InternalServerError, NotFoundError } from "../utils/errors/app.error";
import { generateIdempotencyKey } from "../utils/generateIdempotencyKey";


//usera,userb books hotel -> usera hits first then lock it for 4minutes for usera to perform booking 
export async function createBookingService(
    createBookingDTO: CreateBookingDTO
) {

    const ttl = serverConfig.LOCK_TTL;
    const bookingResource = `hotel:${createBookingDTO.hotelId}`;
    console.log("Acquired lock on Booking resource : ", bookingResource);

    try {
        await redlock.acquire([bookingResource], ttl);
        const booking = await createBooking({
            userId: createBookingDTO.userId,
            hotelId: createBookingDTO.hotelId,
            totalGuests: createBookingDTO.totalGuests,
            bookingAmount: createBookingDTO.bookingAmount,
        });

        const idempotencyKey = await generateIdempotencyKey(); 
        await createIdempotencyKey(idempotencyKey, booking.id);

        return {
            bookingId: booking.id,
            idempotencyKey: idempotencyKey,
        };
    } catch (error) {
        throw new InternalServerError('Failed to acquire lock for booking resource');
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
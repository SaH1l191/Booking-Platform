import type { IdempotencyKey, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { BadRequestError, NotFoundError } from "../utils/errors/app.error";
import { validate as isValidUUID } from "uuid";
 
export async function createIdempotencyKey(key: string, bookingId: number) {
    const idempotencyKey = await prisma.idempotencyKey.create({
        data: {
            key: key,
            booking: {
                connect: {
                    id: bookingId
                }
            }
        }
    })
    return idempotencyKey
} 
export async function getIdempotencyKey(tx:Prisma.TransactionClient,key: string) {

    if(!isValidUUID(key)) {
        throw new BadRequestError("Invalid idempotency key format");
    }

    const idempotencyKey: Array<IdempotencyKey> = await tx.$queryRaw`SELECT * FROM "IdempotencyKey" WHERE key = ${key} FOR UPDATE`
    if(!idempotencyKey || idempotencyKey.length === 0) {
        throw new NotFoundError("Idempotency key not found");
    }
    console.log("Idempotency key : ", idempotencyKey);
    return await tx.idempotencyKey.findUnique({
        where: { key },  
    });
}


export async function getBookingById(bookingId: number) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
    })
    return booking
}

export async function confirmBooking(tx: Prisma.TransactionClient, bookingId: number) {
    const booking = await tx.booking.update({
        where: {
            id: bookingId
        },
        data: {
            status: "CONFIRMED"
        }
    })
    return booking
}
export async function cancelBooking(tx: Prisma.TransactionClient, bookingId: number) {
    const booking = await tx.booking.update({
        where: {
            id: bookingId
        },
        data: {
            status: "CANCELLED"
        }
    })
    return booking
}

export async function finalizeIdempotencyKey(tx: Prisma.TransactionClient, key: string) {
    const idempotencyKey = await tx.idempotencyKey.update({
        where: {
            key
        }, data: {
            finalized: true
        }
    })
    return idempotencyKey
}

export async function createBooking(bookingInput: Prisma.BookingCreateInput) {
    const booking = await prisma.booking.create({ data: bookingInput });
    return booking
}
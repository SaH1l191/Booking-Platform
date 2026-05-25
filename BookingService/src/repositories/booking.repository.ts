import { prisma } from "../lib/prisma"; 
import { BadRequestError, NotFoundError } from "../utils/errors/app.error.js";
import { validate as isValidUUID } from "uuid";
import { CreateBookingDTO } from "../dto/booking.dto.js";

export async function createIdempotencyKey(tx: any, key: string, bookingId: number) {
    const idempotencyKey = await tx.idempotencykey.create({
        data: {
            key: key,
            booking: {
                connect: {
                    id: bookingId
                }
            },
            updatedAt: new Date()
        }
    })
    return idempotencyKey
}
export async function getIdempotencyKey(tx: any, key: string) {

    if (!isValidUUID(key)) {
        throw new BadRequestError("Invalid idempotency key format");
    }

    const idempotencyKey: any[] =
        await tx.$queryRaw`
            SELECT *
            FROM IdempotencyKey
            WHERE \`key\` = ${key}
            FOR UPDATE
        `;
    if (!idempotencyKey || idempotencyKey.length === 0) {
        throw new NotFoundError("Idempotency key not found");
    }
    console.log("Idempotency key : ", idempotencyKey);
    return await tx.idempotencykey.findUnique({
        where: { key },
    });
}


export async function getBookingById(bookingId: number) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
    })
    return booking
}

export async function confirmBooking(tx: any, bookingId: number) {
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
export async function cancelBooking(tx: any, bookingId: number) {
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

export async function finalizeIdempotencyKey(tx: any, key: string) {
    const idempotencyKey = await tx.idempotencykey.update({
        where: {
            key
        }, data: {
            finalized: true
        }
    })
    return idempotencyKey
}

export async function createBooking(bookingInput: any) {
    const booking = await prisma.booking.create({ data: bookingInput });
    return booking
}

export async function conflictBooking(tx: any, createBookingDTO: CreateBookingDTO) {
    return await tx.booking.findFirst({
        where: {
            hotelId: createBookingDTO.hotelId,
            roomId: createBookingDTO.roomId, 
            AND: [
                {
                    checkIn: {
                        lt: new Date(createBookingDTO.checkOut),
                    }
                },
                {
                    checkOut: {
                        gt: new Date(createBookingDTO.checkIn),
                    }
                }
            ],
            OR: [
                { status: 'CONFIRMED' },
                {
                    status: 'PENDING',
                    expiresAt: {
                        gt: new Date()
                    }
                }
            ],
        }
    });
}
export async function createBookingRecord(
    tx: any,
    input: {
        userId: number;
        hotelId: number;

        roomId: number;
        totalGuests: number;
        bookingAmount: number;
        checkIn: Date;
        checkOut: Date;
        expiresAt: Date;
    }
) {
    return tx.booking.create({
        data: input,
    });
}

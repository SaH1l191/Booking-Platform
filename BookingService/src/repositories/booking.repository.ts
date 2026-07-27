import { prisma } from "../lib/prisma";
import { CreateBookingDTO } from "../dto/booking.dto";
import logger from "../config/logger";
import crypto from "crypto";
import { Prisma } from "@prisma/client";

export interface OutboxPayload {
    eventType: string;
    payload: Record<string, any>;
}

export async function createIdempotencyKey(tx: any, key: string, bookingId: number) {
    logger.info("Creating idempotency key", { key, bookingId });
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

export async function getIdempotencyKey(key: string) {
    logger.info("Checking idempotency key", { key });
    const idempotencyKey = await prisma.idempotencykey.findUnique({
        where: { key },
        include: { booking: true },
    });
    return idempotencyKey;
}

export async function getBookingById(bookingId: number) {
    console.log("Fetching booking by ID in repository", { bookingId });
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
    })
    return booking
}

//  confirmBooking is never called (confirmation handled by payment-event-consumer)
// export async function confirmBooking(tx: any, bookingId: number) {
//     logger.info("Confirming booking in repository", { bookingId });
//     const booking = await tx.booking.update({
//         where: {
//             id: bookingId
//         },
//         data: {
//             status: "CONFIRMED"
//         }
//     })
//     return booking
// }

export async function cancelBooking(tx: any, bookingId: number) {
    logger.info("Cancelling booking in repository", { bookingId });
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
    logger.info("Finalizing idempotency key", { key });
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
    logger.info("Creating booking record", { bookingInput });
    const booking = await prisma.booking.create({ data: bookingInput });
    return booking
}

export async function conflictBooking(tx: any, createBookingDTO: CreateBookingDTO) {
    logger.info("Checking for conflicting bookings (FOR UPDATE)", { hotelId: createBookingDTO.hotelId, roomId: createBookingDTO.roomId });
    const now = new Date();
    const rows: any[] = await tx.$queryRaw`
        SELECT id, status, checkOut, expiresAt FROM booking
        WHERE hotelId = ${createBookingDTO.hotelId}
          AND roomId = ${createBookingDTO.roomId}
          AND checkIn < ${new Date(createBookingDTO.checkOut)}
          AND checkOut > ${new Date(createBookingDTO.checkIn)}
          AND (
            status = 'CONFIRMED'
            OR (status = 'PENDING' AND expiresAt > ${now})
          )
        FOR UPDATE
    `;
    return rows.length > 0 ? rows[0] : null;
}

export async function createBookingRecord(
    tx: any,
    input: {
        userId: number;
        userEmail: string;
        hotelId: number;
        roomId: number;
        totalGuests: number;
        bookingAmount: number;
        checkIn: Date;
        checkOut: Date;
        expiresAt: Date;
    }
) {
    logger.info("Creating booking record in transaction", { userId: input.userId, hotelId: input.hotelId });
    return tx.booking.create({
        data: input,
    });
}

export interface PaginationParams {
    page: number;
    limit: number;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export async function getAllBookings(pagination?: PaginationParams): Promise<PaginatedResult<any> | any[]> {
    console.log("Fetching all bookings for admin", { pagination });
    if (pagination) {
        const { page, limit } = pagination;
        const [data, total] = await Promise.all([
            prisma.booking.findMany({
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.booking.count(),
        ]);
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    return await prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
    });
}

export async function getBookingsByUserId(userId: number, pagination?: PaginationParams): Promise<PaginatedResult<any> | any[]> {
    console.log("Fetching bookings for user in repository", { userId, pagination });
    if (pagination) {
        const { page, limit } = pagination;
        const [data, total] = await Promise.all([
            prisma.booking.findMany({
                where: { userId },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.booking.count({ where: { userId } }),
        ]);
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    return await prisma.booking.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
}

export async function getBookingsByHotelId(hotelId: number, pagination?: PaginationParams): Promise<PaginatedResult<any> | any[]> {
    console.log("Fetching bookings for hotel in repository", { hotelId, pagination });
    if (pagination) {
        const { page, limit } = pagination;
        const [data, total] = await Promise.all([
            prisma.booking.findMany({
                where: { hotelId },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.booking.count({ where: { hotelId } }),
        ]);
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    return await prisma.booking.findMany({
        where: { hotelId },
        orderBy: { createdAt: 'desc' },
    });
}

export async function insertOutboxEvent(tx: any, eventType: string, payload: Record<string, any>) {
    logger.info("Inserting outbox event", { eventType, payload });
    return tx.outbox.create({
        data: {
            eventId: crypto.randomUUID(),
            eventType,
            payload,
        },
    });
}

export async function expireStaleBookings() {
    logger.info("Expiring stale PENDING bookings");
    const now = new Date();

    const expiring = await prisma.booking.findMany({
        where: {
            status: "PENDING",
            expiresAt: { lt: now },
        },
        select: {
            id: true,
        },
    });

    if (expiring.length === 0) return;

    const ids = expiring.map((b) => b.id);
    await prisma.$executeRaw`
        UPDATE booking
        SET status = 'EXPIRED', updatedAt = ${now}
        WHERE id IN (${Prisma.join(ids)})
    `;

    logger.info("Expired stale bookings", { count: expiring.length });
}
//removed redis expiry from exprired

export async function getCompletedBookingsByUserId(userId: number) {
    console.log("Fetching completed bookings for user in repository", { userId });
    return await prisma.booking.findMany({
        where : {userId, 
            status: 'CONFIRMED',
            checkOut : { lt: new Date() }
        },
        
    })
}

export async function getUserEmailByBookingId(bookingId: number) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { userEmail: true },
    });
    return booking?.userEmail || "";
}
import { prisma } from "../lib/prisma";
import { CheckAvailabilityDTO, CreateBookingDTO } from "../dto/booking.dto";
import logger from "../config/logger";

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
// export async function getIdempotencyKey(tx: any, key: string) {

//     if (!isValidUUID(key)) {
//         logger.info("Invalid idempotency key format", { key });
//         throw new BadRequestError("Invalid idempotency key format");
//     }

//     const idempotencyKey: any[] =
//         await tx.$queryRaw`
//             SELECT *
//             FROM IdempotencyKey
//             WHERE \`key\` = ${key}
//             FOR UPDATE
//         `;
//     if (!idempotencyKey || idempotencyKey.length === 0) {
//         logger.info("Idempotency key not found in raw query", { key });
//         throw new NotFoundError("Idempotency key not found");
//     }

//     const keyData = await tx.idempotencykey.findUnique({
//         where: { key },
//     });
//     logger.info("Idempotency key found", { key: keyData?.key, finalized: keyData?.finalized });
//     return keyData;
// }


export async function getBookingById(bookingId: number) {
    logger.info("Fetching booking by ID in repository", { bookingId });
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
    })
    return booking
}

export async function confirmBooking(tx: any, bookingId: number) {
    logger.info("Confirming booking in repository", { bookingId });
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
    logger.info("Checking for conflicting bookings", { hotelId: createBookingDTO.hotelId, roomId: createBookingDTO.roomId });
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
                    AND: [
                        { status: "PENDING" },
                        { expiresAt: { gt: new Date() } }
                    ]
                }
            ],
        }
    });
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

export async function getBookingsByUserId(userId: number) {
    logger.info("Fetching bookings for user in repository", { userId });
    return await prisma.booking.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });
}

export async function getBookingsByHotelId(hotelId: number) {
    logger.info("Fetching bookings for hotel in repository", { hotelId });
    return await prisma.booking.findMany({
        where: { hotelId },
        orderBy: { createdAt: 'desc' }
    });
}

export async function checkHotelRoomAvailability(data: CheckAvailabilityDTO) {
    return await prisma.booking.findFirst({
        where: {
            hotelId: data.hotelId,
            roomId: data.roomId,
            AND: [
                {
                    checkIn: {
                        lt: new Date(data.checkOut),
                    }
                },
                {
                    checkOut: {
                        gt: new Date(data.checkIn),
                    }
                }
            ],
            OR: [
                { status: 'CONFIRMED' },
                {
                    AND: [
                        { status: "PENDING" },
                        { expiresAt: { gt: new Date() } }
                    ]
                }
            ],
        }
    });
}

export async function insertOutboxEvent(tx: any, eventType: string, payload: Record<string, any>) {
    logger.info("Inserting outbox event", { eventType, payload });
    return tx.outbox.create({
        data: {
            eventType,
            payload,
        },
    });
}

export async function expireStaleBookings() {
    logger.info("Expiring stale PENDING bookings");
    const result = await prisma.$executeRaw`
        UPDATE booking
        SET status = 'EXPIRED', updatedAt = NOW()
        WHERE status = 'PENDING' AND expiresAt < NOW()
    `;
    logger.info("Expired stale bookings", { count: result });
    return result;
}

export async function getBookingWithPayment(tx: any, bookingId: number) {
    return tx.booking.findUnique({
        where: { id: bookingId },
        include: { payments: true },
    });
}

export async function getUserEmailByBookingId(bookingId: number) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { userEmail: true },
    });
    return booking?.userEmail || "";
}

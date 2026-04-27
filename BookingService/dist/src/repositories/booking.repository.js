"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIdempotencyKey = createIdempotencyKey;
exports.getIdempotencyKey = getIdempotencyKey;
exports.getBookingById = getBookingById;
exports.confirmBooking = confirmBooking;
exports.cancelBooking = cancelBooking;
exports.finalizeIdempotencyKey = finalizeIdempotencyKey;
exports.createBooking = createBooking;
const client_1 = require("../prisma/client");
async function createIdempotencyKey(key, bookingId) {
    const idempotencyKey = await client_1.prisma.idempotencyKey.create({
        data: {
            key: key,
            booking: {
                connect: {
                    id: bookingId
                }
            }
        }
    });
    return idempotencyKey;
}
async function getIdempotencyKey(key) {
    const idempotencyKey = await client_1.prisma.idempotencyKey.findUnique({
        where: {
            key
        }
    });
    return idempotencyKey;
}
async function getBookingById(bookingId) {
    const booking = await client_1.prisma.booking.findUnique({
        where: { id: bookingId },
    });
    return booking;
}
async function confirmBooking(bookingId) {
    const booking = await client_1.prisma.booking.update({
        where: {
            id: bookingId
        },
        data: {
            status: "CONFIRMED"
        }
    });
    return booking;
}
async function cancelBooking(bookingId) {
    const booking = await client_1.prisma.booking.update({
        where: {
            id: bookingId
        },
        data: {
            status: "CANCELLED"
        }
    });
    return booking;
}
async function finalizeIdempotencyKey(key) {
    const idempotencyKey = await client_1.prisma.idempotencyKey.update({
        where: {
            key
        }, data: {
            finalized: true
        }
    });
    return idempotencyKey;
}
async function createBooking(bookingInput) {
    const booking = await client_1.prisma.booking.create({ data: bookingInput });
    return booking;
}

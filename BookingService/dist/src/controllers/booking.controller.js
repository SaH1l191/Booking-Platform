"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBookingHandler = createBookingHandler;
exports.confirmBookingHandler = confirmBookingHandler;
const booking_service_1 = require("../services/booking.service");
async function createBookingHandler(req, res) {
    const booking = await (0, booking_service_1.createBookingService)(req.body);
    res.status(201).json({
        bookingId: booking.bookingId,
        idempotencyKey: booking.idempotencyKey
    });
}
async function confirmBookingHandler(req, res) {
    const idempotencyKeyParam = req.params.idempotencyKey;
    const idempotencyKey = Array.isArray(idempotencyKeyParam)
        ? idempotencyKeyParam[0]
        : idempotencyKeyParam;
    const booking = await (0, booking_service_1.confirmBookingService)(idempotencyKey);
    res.status(200).json({
        bookingId: booking.id,
        status: booking.status
    });
}

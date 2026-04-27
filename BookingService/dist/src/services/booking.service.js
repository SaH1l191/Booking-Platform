"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBookingService = createBookingService;
exports.confirmBookingService = confirmBookingService;
const booking_repository_1 = require("../repositories/booking.repository");
const app_error_1 = require("../utils/errors/app.error");
const generateIdempotencyKey_1 = require("../utils/generateIdempotencyKey");
async function createBookingService(createBookingDTO) {
    const booking = await (0, booking_repository_1.createBooking)({
        userId: createBookingDTO.userId,
        hotelId: createBookingDTO.hotelId,
        totalGuests: createBookingDTO.totalGuests,
        bookingAmount: createBookingDTO.bookingAmount
    });
    const idempotencyKey = await (0, generateIdempotencyKey_1.generateIdempotencyKey)();
    await (0, booking_repository_1.createIdempotencyKey)(idempotencyKey, booking.id);
    return { bookingId: booking.id, idempotencyKey: idempotencyKey };
}
async function confirmBookingService(idempotencyKey) {
    const idempotencyKeyData = await (0, booking_repository_1.getIdempotencyKey)(idempotencyKey);
    if (!idempotencyKeyData || !idempotencyKeyData.bookingId) {
        throw new app_error_1.NotFoundError("Invalid idempotency key");
    }
    if (idempotencyKeyData.finalized) {
        throw new app_error_1.BadRequestError("Idempotency key already finalized");
    }
    const booking = await (0, booking_repository_1.confirmBooking)(idempotencyKeyData.bookingId);
    await (0, booking_repository_1.finalizeIdempotencyKey)(idempotencyKey);
    return booking;
}

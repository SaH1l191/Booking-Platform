"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBookingSchema = void 0;
const zod_1 = require("zod");
exports.createBookingSchema = zod_1.z.object({
    userId: zod_1.z.number({ message: "User ID must be a number" }),
    hotelId: zod_1.z.number({ message: "Hotel ID must be a number" }),
    totalGuests: zod_1.z.number({ message: "Total guests must be a number" })
        .min(1, { message: "Total guests must be at least 1" }),
    bookingAmount: zod_1.z.number({ message: "Booking amount must be a number" }).min(1, { message: "Booking amount must be greater than 0" })
});

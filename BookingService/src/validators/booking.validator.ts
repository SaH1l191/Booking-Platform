import { z } from 'zod';
export const createBookingSchema = z.object({
    hotelId: z.number({ message: "Hotel ID must be a number" }).int().positive({ message: "Hotel ID must be a positive integer" }),
    totalGuests: z.number({ message: "Total guests must be a number" })
        .min(1, { message: "Total guests must be at least 1" }),
    bookingAmount: z.number({ message: "Booking amount must be a number" }).min(1, { message: "Booking amount must be greater than 0" }),
    roomId: z.number({ message: "Room ID must be a number" }).int().positive({ message: "Room ID must be a positive integer" }),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Check-in must be YYYY-MM-DD"),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Check-out must be YYYY-MM-DD"),
    idempotencyKey: z.string().uuid("Idempotency key must be a valid UUID").optional(),
}).refine((data) => new Date(data.checkOut) > new Date(data.checkIn),
    {
        message: "Check-out must be after check-in",
        path: ["checkOut"],
    }
).refine((data) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(data.checkIn) >= today;
},
    {
        message: "Check-in cannot be in the past",
        path: ["checkIn"],
    }
);

export const getBookingsByHotelSchema = z.object({
    hotelId: z.coerce.number().int().positive(),
});

export const checkAvailabilitySchema = z.object({
    hotelId: z.coerce.number().int().positive(),
    roomId: z.coerce.number().int().positive(),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Check-in must be YYYY-MM-DD"),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Check-out must be YYYY-MM-DD"),
}).refine(
    (data) => new Date(data.checkOut) > new Date(data.checkIn),
    {
        message: "Check-out must be after check-in",
        path: ["checkOut"],
    }
).refine((data) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(data.checkIn) >= today;
},
    {
        message: "Check-in cannot be in the past",
        path: ["checkIn"],
    }
);

export const bookingIdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

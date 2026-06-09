import { z } from 'zod'; 
export const createBookingSchema = z.object({
    hotelId: z.number({ message: "Hotel ID must be a number" }),
    totalGuests: z.number({ message: "Total guests must be a number" })
        .min(1, { message: "Total guests must be at least 1" }),
    bookingAmount: z.number({ message: "Booking amount must be a number" }).min(1, { message: "Booking amount must be greater than 0" }),
    roomId: z.number({ message: "Room ID must be a number" }),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Check-in must be YYYY-MM-DD"),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Check-out must be YYYY-MM-DD"),
}).refine((data) => new Date(data.checkOut) > new Date(data.checkIn),
    {
        message: "Check-out must be after check-in",
        path: ["checkOut"],
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
);

export const confirmBookingSchema = z.object({
    idempotencyKey: z.string().uuid("Invalid idempotency key format"),
});

export const bookingIdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});



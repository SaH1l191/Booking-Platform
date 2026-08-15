import { cancelBookingService, checkAvailabilityService, createBookingService, getAllBookingsService, getBookingByIdService, getBookingsByHotelService, getBookingsByUserService } from '../services/booking.service';
import { Request, Response } from 'express';
import logger from '../config/logger';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { CheckAvailabilityDTO } from '../dto/booking.dto';
import { subscribeBooking } from '../utils/sse-hub';


export async function createBookingHandler(req: AuthRequest, res: Response) {
    console.log("Creating booking", { body: req.body });

    const userId = req.user.userId!;
    const userEmail = req.user.email!;
    const idempotencyKey = req.body.idempotencyKey;

    const booking = await createBookingService({ createBookingDTO: req.body, userId, userEmail, idempotencyKey });
    console.log("Booking created successfully", { bookingId: booking.bookingId });

    sendSuccess(res, { bookingId: booking.bookingId, idempotencyKey: booking.idempotencyKey, expiresAt: booking.expiresAt, duplicated: booking.duplicated }, 'Booking created', booking.duplicated ? 200 : 201);
}

function extractPagination(query: any): { page: number; limit: number } | undefined {
    const page = query.page ? parseInt(query.page as string, 10) : undefined;
    const limit = query.limit ? parseInt(query.limit as string, 10) : undefined;
    if (page && limit) return { page, limit };
    if (page) return { page, limit: 10 };
    return undefined;
}

export async function getAllBookingsHandler(req: AuthRequest, res: Response) {
    console.log("Fetching all bookings for admin");
    const pagination = extractPagination(req.query);
    const bookings = await getAllBookingsService(pagination);
    sendSuccess(res, bookings, 'All bookings fetched', 200);
}

export async function getBookingsByUserHandler(req: AuthRequest, res: Response) {
    const userId = req.user.userId!;
    console.log("Fetching bookings for user", { userId });
    const pagination = extractPagination(req.query);
    const bookings = await getBookingsByUserService(userId, pagination);
    sendSuccess(res, bookings, 'User bookings fetched', 200);
}

export async function getBookingsByHotelHandler(req: AuthRequest, res: Response) {
    const hotelIdParam = req.params.hotelId as string;
    const hotelId = parseInt(hotelIdParam);
    console.log("Fetching bookings for hotel", { hotelId });
    const pagination = extractPagination(req.query);
    const bookings = await getBookingsByHotelService(hotelId, pagination);
    sendSuccess(res, bookings, 'Hotel bookings fetched', 200);
}

export async function getBookingByIdHandler(req: AuthRequest, res: Response) {
    const bookingIdParam = req.params.id as string;
    const bookingId = parseInt(bookingIdParam);
    console.log("Fetching booking by ID", { bookingId });
    const booking = await getBookingByIdService(bookingId);
    sendSuccess(res, booking, 'Booking fetched', 200);
}

export async function cancelBookingHandler(req: AuthRequest, res: Response) {
    const bookingIdParam = req.params.id as string;
    const bookingId = parseInt(bookingIdParam);
    const userId = req.user.userId!;
    const userEmail = req.user.email || "";
    console.log("Cancelling booking", { bookingId, userId });
    const booking = await cancelBookingService(bookingId, userId, userEmail);
    sendSuccess(res, booking, 'Booking cancelled', 200);
}

export async function checkAvailabilityHandler(req: AuthRequest, res: Response) {
    console.log("Checking availability", { query: req.query, userId: req.user.userId });
    const data = req.query as unknown as CheckAvailabilityDTO;

    const availability = await checkAvailabilityService(data);
    console.log("Availability checked successfully", { available: availability });
    sendSuccess(res, availability, 'Availability checked', 200);
}

export function streamBookingsHandler(req: AuthRequest, res: Response) {
    const userId = req.user.userId!;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const flush = () => { if (typeof (res as any).flush === "function") (res as any).flush(); };

    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
    flush();

    const unsubscribe = subscribeBooking(userId, (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        flush();
    });

    req.on("close", () => {
        unsubscribe();
    });
}

import { cancelBookingService, checkAvailabilityService, createBookingService, getAllBookingsService, getBookingByIdService, getBookingsByHotelService, getBookingsByUserService } from '../services/booking.service';
import { Response } from 'express';
import logger from '../config/logger';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { CheckAvailabilityDTO } from '../dto/booking.dto';


export async function createBookingHandler(req: AuthRequest, res: Response) {
    console.log("Creating booking", { body: req.body });

    const userId = req.user.userId!;
    const userEmail = req.user.email!;
    const idempotencyKey = req.body.idempotencyKey;

    const booking = await createBookingService({ createBookingDTO: req.body, userId, userEmail, idempotencyKey });
    console.log("Booking created successfully", { bookingId: booking.bookingId });

    sendSuccess(res, { bookingId: booking.bookingId, idempotencyKey: booking.idempotencyKey, expiresAt: booking.expiresAt, duplicated: booking.duplicated }, 'Booking created', 201);
}

export async function getAllBookingsHandler(req: AuthRequest, res: Response) {
    console.log("Fetching all bookings for admin");
    const bookings = await getAllBookingsService();
    sendSuccess(res, bookings, 'All bookings fetched', 200);
}

export async function getBookingsByUserHandler(req: AuthRequest, res: Response) {
    const userId = req.user.userId!;
    console.log("Fetching bookings for user", { userId });
    const bookings = await getBookingsByUserService(userId);
    sendSuccess(res, bookings, 'User bookings fetched', 200);
}

export async function getBookingsByHotelHandler(req: AuthRequest, res: Response) {
    const hotelIdParam = req.params.hotelId as string;
    const hotelId = parseInt(hotelIdParam);
    console.log("Fetching bookings for hotel", { hotelId });
    const bookings = await getBookingsByHotelService(hotelId);
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

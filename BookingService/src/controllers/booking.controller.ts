import { cancelBookingService, checkAvailabilityService, confirmBookingService, createBookingService, getBookingByIdService, getBookingsByHotelService, getBookingsByUserService } from '../services/booking.service';
import { Request, Response } from 'express';
import logger from '../config/logger';
import { sendSuccess } from '../utils/response';
import { addEmailToQueue } from '../producers/email-producer';
import { AuthRequest } from '../middlewares/auth.middleware';
import { CheckAvailabilityDTO } from '../dto/booking.dto';


export async function createBookingHandler(req: AuthRequest, res: Response) {
    logger.info("Creating booking", { body: req.body });

    const userId = req.user.userId!;

    const booking = await createBookingService({ createBookingDTO: req.body, userId });
    logger.info("Booking created successfully", { bookingId: booking.bookingId });

    sendSuccess(res, { bookingId: booking.bookingId, idempotencyKey: booking.idempotencyKey }, 'Booking created')
}

export async function confirmBookingHandler(req: AuthRequest, res: Response) {
    const idempotencyKeyParam = req.params.idempotencyKey;
    const userEmail = req.user.email!;
    const idempotencyKey =
        Array.isArray(idempotencyKeyParam)
            ? idempotencyKeyParam[0] :
            idempotencyKeyParam;

    logger.info("Confirming booking", { idempotencyKey });
    const booking = await confirmBookingService(idempotencyKey)
    logger.info("Booking confirmed successfully", { bookingId: booking.id });

    const emailPayload = {
        to: userEmail,
        subject: "Your booking is confirmed",
        templateId: "booking-confirmed",
        params: {
            bookingId: booking.id,
            userName: "Valued Customer",
            hotelName: booking.hotel?.name ?? "Hotel",
            roomName: booking.room?.name ?? "Room",
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
        },
    };
    await addEmailToQueue(emailPayload);

    sendSuccess(res, { bookingId: booking.id, status: booking.status }, 'Booking confirmed');
}

export async function getBookingsByUserHandler(req: AuthRequest, res: Response) {
    const userId = req.user.userId!;
    logger.info("Fetching bookings for user", { userId });
    const bookings = await getBookingsByUserService(userId);
    sendSuccess(res, bookings, 'User bookings fetched');
}

export async function getBookingsByHotelHandler(req: AuthRequest, res: Response) {
    const hotelIdParam = req.params.hotelId as string;
    const hotelId = parseInt(hotelIdParam);
    logger.info("Fetching bookings for hotel", { hotelId });
    const bookings = await getBookingsByHotelService(hotelId);
    sendSuccess(res, bookings, 'Hotel bookings fetched');
}

export async function getBookingByIdHandler(req: AuthRequest, res: Response) {
    const bookingIdParam = req.params.id as string;
    const bookingId = parseInt(bookingIdParam);
    logger.info("Fetching booking by ID", { bookingId });
    const booking = await getBookingByIdService(bookingId);
    sendSuccess(res, booking, 'Booking fetched');
}

export async function cancelBookingHandler(req: AuthRequest, res: Response) {
    const bookingIdParam = req.params.id as string;
    const bookingId = parseInt(bookingIdParam);
    const userId = req.user.userId!;
    logger.info("Cancelling booking", { bookingId, userId });
    const booking = await cancelBookingService(bookingId, userId);
    sendSuccess(res, booking, 'Booking cancelled');
}

export async function checkAvailabilityHandler(req: AuthRequest, res: Response) {
    logger.info("Checking availability", { query: req.query, userId: req.user.userId });
    const data = req.query as unknown as CheckAvailabilityDTO;

    const availability = await checkAvailabilityService(data);
    logger.info("Availability checked successfully", { available: availability });
    sendSuccess(res, availability, 'Availability checked');
}

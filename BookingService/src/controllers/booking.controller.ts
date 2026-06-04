import { cancelBookingService, confirmBookingService, createBookingService, getBookingByIdService, getBookingsByHotelService, getBookingsByUserService } from '../services/booking.service';
import { Request, Response } from 'express';
import logger from '../config/logger';
import { AuthRequest } from '../middlewares/auth.middleware';


export async function createBookingHandler(req: AuthRequest, res: Response) {
    logger.info("Creating booking with data:", req.body);

    const userId = req.userId!;

    const booking = await createBookingService({ createBookingDTO: req.body, userId });
    logger.info("Booking created successfully:", { bookingId: booking.bookingId });
    res.status(201).json({
        bookingId: booking.bookingId,
        idempotencyKey: booking.idempotencyKey
    })
}

//race conditions can happen here 
export async function confirmBookingHandler(req: Request, res: Response) {
    const idempotencyKeyParam = req.params.idempotencyKey;
    const idempotencyKey =
        Array.isArray(idempotencyKeyParam)
            ? idempotencyKeyParam[0] :
            idempotencyKeyParam;

    logger.info(`Confirming booking with idempotencyKey: ${idempotencyKey}`);
    const booking = await confirmBookingService(idempotencyKey)
    logger.info(`Booking confirmed successfully: ${booking.id}`);
    res.status(200).json({
        bookingId: booking.id,
        status: booking.status
    })
}

export async function getBookingsByUserHandler(req: AuthRequest, res: Response) {
    const userId = req.userId!;
    logger.info(`Fetching bookings for user: ${userId}`);
    const bookings = await getBookingsByUserService(userId);
    res.status(200).json(bookings);
}

export async function getBookingsByHotelHandler(req: Request, res: Response) {
    const hotelId = parseInt(req.params.hotelId);
    logger.info(`Fetching bookings for hotel: ${hotelId}`);
    const bookings = await getBookingsByHotelService(hotelId);
    res.status(200).json(bookings);
}

export async function getBookingByIdHandler(req: Request, res: Response) {
    const bookingId = parseInt(req.params.id);
    logger.info(`Fetching booking by id: ${bookingId}`);
    const booking = await getBookingByIdService(bookingId);
    res.status(200).json(booking);
}

export async function cancelBookingHandler(req: AuthRequest, res: Response) {
    const bookingId = parseInt(req.params.id);
    const userId = req.userId!;
    logger.info(`Cancelling booking: ${bookingId} for user: ${userId}`);
    const booking = await cancelBookingService(bookingId, userId);
    res.status(200).json(booking);
}
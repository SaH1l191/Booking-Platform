import { confirmBookingService, createBookingService } from '../services/booking.service';
import { Request, Response } from 'express';


export async function  createBookingHandler(req:Request, res : Response) {
    const booking = await createBookingService(req.body)
    res.status(201).json({
        bookingId : booking.bookingId,
        idempotencyKey : booking.idempotencyKey
    })
}

//race conditions can happen here 
export async function confirmBookingHandler(req:Request, res : Response) {
    const idempotencyKeyParam = req.params.idempotencyKey;
    const idempotencyKey = 
    Array.isArray(idempotencyKeyParam)
        ? idempotencyKeyParam[0]: 
     idempotencyKeyParam;

    const booking = await confirmBookingService(idempotencyKey)
    res.status(200).json({
        bookingId : booking.id,
        status : booking.status
    })
}
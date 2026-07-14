
import logger from '../config/logger';
import { getRabbitMQChannel } from '../queues/event-queue';

export const BOOKING_EVENTS_QUEUE = "booking-events";

export const BOOKING_CREATED_EVENT = "BOOKING_CREATED";
export const BOOKING_CONFIRMED_EVENT = "BOOKING_CONFIRMED";
export const BOOKING_CANCELLED_EVENT = "BOOKING_CANCELLED";

export interface BookingCreatedPayload {
    bookingId: number;
    userId: number;
    hotelId: number;
    roomId: number;
    checkIn: string;
    checkOut: string;
    bookingAmount: number;
    totalGuests: number;
    userEmail: string;
}

export interface BookingStatusPayload {
    bookingId: number;
    userId: number;
    hotelId: number;
    roomId: number;
    userEmail: string;
    status: string;
}

export const publishBookingEvent = async (eventType: string, payload: Record<string, any>) => {
    const channel = await getRabbitMQChannel();
    await channel.assertQueue(BOOKING_EVENTS_QUEUE, { durable: true });

    const message = {
        eventType,
        payload,
    };

    channel.sendToQueue(BOOKING_EVENTS_QUEUE, Buffer.from(JSON.stringify(message)), {
        persistent: true,
        contentType: 'application/json',
    });

    logger.info("Booking event published", { eventType, bookingId: payload.bookingId });
}

export const addBookingCreatedEvent = async (payload: BookingCreatedPayload) => {
    await publishBookingEvent(BOOKING_CREATED_EVENT, payload);
}

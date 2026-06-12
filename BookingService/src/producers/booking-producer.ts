
import logger from '../config/logger';
import { getRabbitMQChannel } from '../queues/event-queue';

// TODO: Publish to RabbitMQ queue "booking-events" 

export const BOOKING_CREATED_EVENT = "booking-created";

export interface BookingCreatedPayload {
    bookingId: number;
    userId: number;
    hotelId: number;
    roomId: number;
    checkIn: string;
    checkOut: string;
    bookingAmount: number;
    totalGuests: number;
}

export const addBookingCreatedEvent = async (payload: BookingCreatedPayload) => {
    
    const channel = await getRabbitMQChannel();
    await channel.assertExchange(BOOKING_CREATED_EVENT, "direct", { durable: true });

    channel.sendToQueue(BOOKING_CREATED_EVENT, Buffer.from(JSON.stringify(payload)));
    logger.info("BookingCreated event (stub - implement with amqplib)", { bookingId: payload.bookingId });
}

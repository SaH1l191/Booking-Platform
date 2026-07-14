import { getRabbitMQChannel } from "../queues/event-queue";
import { prisma } from "../lib/prisma";
import logger from "../config/logger";
import { BOOKING_CANCELLED_EVENT } from "../producers/booking-producer";
import axios from "axios";

interface PaymentEvent {
    eventType: string;
    payload: {
        paymentId?: number;
        bookingId: number;
        userId?: number;
        userEmail?: string;
        amount?: number;
        currency?: string;
        status?: string;
        failureReason?: string;
    };
}

let isRunning = false;

export async function startPaymentEventConsumer() {
    if (isRunning) return;
    isRunning = true;

    try {
        const channel = await getRabbitMQChannel();
        await channel.assertExchange("payment_events_exchange", "fanout", { durable: true });

        const queueName = "booking-service-payment-events";
        await channel.assertQueue(queueName, { durable: true });
        await channel.bindQueue(queueName, "payment_events_exchange", "");

        channel.consume(queueName, async (msg) => {
            if (!msg) return;
            await handleMessage(msg);
        }, { noAck: false });

        logger.info("Booking payment event consumer started", { queue: queueName, exchange: "payment_events_exchange" });
    } catch (error) {
        logger.error("Failed to start payment event consumer", { error: (error as Error).message });
        isRunning = false;
    }
}

async function handleMessage(msg: any) {
    try {
        const event: PaymentEvent = JSON.parse(msg.content.toString());
        logger.info("Received payment event", { eventType: event.eventType, bookingId: event.payload.bookingId });

        switch (event.eventType) {
            case "PAYMENT_CAPTURED":
                await handlePaymentCaptured(event);
                break;
            case "PAYMENT_FAILED":
                await handlePaymentFailed(event);
                break;
            case "PAYMENT_REFUNDED":
                await handlePaymentRefunded(event);
                break;
            default:
                logger.info("Unhandled payment event", { eventType: event.eventType });
        }

        const channel = await getRabbitMQChannel();
        channel.ack(msg);
    } catch (error) {
        logger.error("Failed to handle payment event", { error: (error as Error).message });
        const channel = await getRabbitMQChannel();
        channel.nack(msg, false, true);
    }
}

async function handlePaymentCaptured(event: PaymentEvent) {
    const { bookingId } = event.payload;

    await prisma.$transaction(async (tx: any) => {
        const booking = await tx.booking.findUnique({
            where: { id: bookingId },
            include: { idempotencykey: true },
        });

        if (!booking) {
            logger.warn("Booking not found for PAYMENT_CAPTURED", { bookingId });
            return;
        }

        if (booking.status === "CONFIRMED") {
            logger.info("Booking already confirmed, skipping", { bookingId });
            return;
        }

        if (booking.status === "CANCELLED") {
            logger.warn("Booking is cancelled but payment was captured, skipping confirmation", { bookingId });
            return;
        }

        //preventing race condition by checking if the booking has expired Vs the payment capture time
        if(booking.expiresAt < new Date()){
            logger.warn("Booking has expired but payment was captured, initiating refund", { bookingId });
            
            try {
                const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || "http://payment-service:3003";
                await axios.post(`${paymentServiceUrl}/payments/refund`, {
                    bookingId: bookingId,
                    reason: "BOOKING_EXPIRED"
                });
                logger.info("Refund initiated successfully", { bookingId });
            } catch (refundError) {
                logger.error("Failed to initiate refund", { 
                    bookingId, 
                    error: (refundError as Error).message 
                });
            }
            
            return;
        }

        await tx.booking.update({
            where: { id: bookingId },
            data: { status: "CONFIRMED" },
        });
        logger.info("Booking status updated to CONFIRMED", { bookingId });

        if (booking.idempotencykey && !booking.idempotencykey.finalized) {
            await tx.idempotencykey.update({
                where: { id: booking.idempotencykey.id },
                data: { finalized: true },
            });
        }

        logger.info("Booking confirmed via payment event", { bookingId });

        try {
            const { redisClient } = await import("../config/redis.config");
            const redisKey = `room_availability:hotel:${booking.hotelId}:room:${booking.roomId}`;
            const dates: string[] = [];
            const startDate = new Date(booking.checkIn);
            const endDate = new Date(booking.checkOut);

            for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
                dates.push(d.toISOString().split("T")[0]);
            }

            if (dates.length > 0) {
                await redisClient.sadd(redisKey, ...dates);
                logger.info("Availability cache updated", { redisKey, dates });
            }
        } catch (redisError) {
            logger.error("Failed to update availability cache", { error: (redisError as Error).message });
        }
    });
}

async function handlePaymentFailed(event: PaymentEvent) {
    const { bookingId } = event.payload;

    await prisma.$transaction(async (tx: any) => {
        const booking = await tx.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            logger.warn("Booking not found for PAYMENT_FAILED", { bookingId });
            return;
        }

        if (booking.status !== "PENDING") {
            logger.info("Booking not in PENDING state, skipping failure handling", { bookingId, status: booking.status });
            return;
        }

        await tx.booking.update({
            where: { id: bookingId },
            data: { status: "CANCELLED" },
        });

        await tx.outbox.create({
            data: {
                eventType: BOOKING_CANCELLED_EVENT,
                payload: {
                    bookingId: booking.id,
                    userId: booking.userId,
                    hotelId: booking.hotelId,
                    roomId: booking.roomId,
                    userEmail: event.payload.userEmail || "",
                    status: "CANCELLED",
                    reason: "Payment failed",
                },
            },
        });

        logger.info("Booking cancelled due to payment failure", { bookingId });
    });
}

async function handlePaymentRefunded(event: PaymentEvent) {
    const { bookingId } = event.payload;

    await prisma.$transaction(async (tx: any) => {
        const booking = await tx.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) return;

        if (booking.status === "CANCELLED") {
            logger.info("Booking already cancelled", { bookingId });
            return;
        }

        await tx.booking.update({
            where: { id: bookingId },
            data: { status: "CANCELLED" },
        });

        await tx.outbox.create({
            data: {
                eventType: BOOKING_CANCELLED_EVENT,
                payload: {
                    bookingId: booking.id,
                    userId: booking.userId,
                    hotelId: booking.hotelId,
                    roomId: booking.roomId,
                    userEmail: event.payload.userEmail || "",
                    status: "CANCELLED",
                    reason: "Payment refunded",
                },
            },
        });

        logger.info("Booking cancelled due to refund", { bookingId });
    });
}

export function stopPaymentEventConsumer() {
    isRunning = false;
    logger.info("Booking payment event consumer stopped");
}

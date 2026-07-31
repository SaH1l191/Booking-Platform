import { getRabbitMQChannel } from "../queues/event-queue";
import { prisma } from "../lib/prisma";
import logger from "../config/logger";
import { BOOKING_CANCELLED_EVENT } from "../producers/booking-producer";
import axios from "axios";
import crypto from "crypto";
import { confirmHold, releaseDates } from "../utils/availabilityCache";
import { redisClient } from "../config/redis.config";

interface PaymentEvent {
    eventId: string;
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
        channel.prefetch(1);

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

        try {
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
        } catch (e: any) {
            if (e.code === 'P2002') {
                logger.info("Duplicate event skipped", { eventId: event.eventId, eventType: event.eventType });
            } else {
                throw e;
            }
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
        await tx.processed_event.create({ data: { eventId: event.eventId } });

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

        //here two conditons : cancelled OR  payment_captured->razoaypay processing -> user immedaitely cancels booking -> razerpay caputres and payment success -> intiiate refund
        if (booking.status === "CANCELLED") {
            logger.warn("Booking is cancelled but payment was captured, skipping confirmation", { bookingId });
            if (event.payload.status === "CAPTURED") {
                try {
                    const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || "http://payment-service:3005";
                    await axios.post(`${paymentServiceUrl}/payments/refund`, {
                        bookingId: bookingId,
                        reason: "LATE_CAPTURE_AFTER_CANCEL"
                    });
                    logger.info("Late refund initiated successfully", { bookingId });
                }
                catch (error) {
                    logger.error("Failed to initiate late refund", { bookingId, error: (error as Error).message });
                }
            }
            return;
        }

        //preventing race condition by checking if the booking has expired Vs the payment capture time
        if (booking.expiresAt < new Date()) {
            logger.warn("Booking has expired but payment was captured, initiating refund", { bookingId });

            try {
                const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || "http://payment-service:3005";
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
            await confirmHold(redisClient, booking.hotelId, booking.roomId, booking.id, booking.checkIn, booking.checkOut);
            logger.info("Availability cache moved from hold to booked", { bookingId });
        } catch (redisError) {
            logger.error("Failed to update availability cache", { error: (redisError as Error).message });
        }
    });
}

async function handlePaymentFailed(event: PaymentEvent) {
    const { bookingId } = event.payload;

    await prisma.$transaction(async (tx: any) => {
        await tx.processed_event.create({ data: { eventId: event.eventId } });

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



        try {
            await releaseDates(redisClient, booking.hotelId, booking.roomId, booking.checkIn, booking.checkOut);
        } catch (redisError) {
            logger.error("Failed to invalidate availability cache on payment failure", { bookingId, error: (redisError as Error).message });
        }
        
        await tx.outbox.create({
            data: {
                eventId: crypto.randomUUID(),
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
        await tx.processed_event.create({ data: { eventId: event.eventId } });

        const booking = await tx.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) return;

       if (booking.status === "CANCELLED" || booking.status === "EXPIRED") {
            logger.info("Booking already in terminal state, skipping status overwrite", { bookingId, status: booking.status });
            return;
        }

        await tx.booking.update({
            where: { id: bookingId },
            data: { status: "CANCELLED" },
        });


        try {
            await releaseDates(redisClient, booking.hotelId, booking.roomId, booking.checkIn, booking.checkOut);
        } catch (redisError) {
            logger.error("Failed to invalidate availability cache on refund", { bookingId, error: (redisError as Error).message });
        }
        

        //uncommented - 22-7- check for event looping payment refunded -> booking cancelled....
        await tx.outbox.create({
            data: {
                eventId: crypto.randomUUID(),
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

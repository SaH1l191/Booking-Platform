import { getRabbitMQChannel } from '../queues/mail.queue';
import logger from '../config/logger';
import { renderMailTemplate } from '../templates/template.hanlder';
import { sendEmail } from '../services/mail.service';
import { getDB } from '../lib/db';

const PAYMENT_QUEUE = "payment-events";

interface PaymentEvent {
    eventId: string;
    eventType: string;
    payload: {
        paymentId: number;
        bookingId: number;
        userId: number;
        userEmail: string;
        amount: number;
        currency: string;
        status: string;
        failureReason?: string;
    };
}

export const paymentNotificationWorker = async () => {
    const channel = await getRabbitMQChannel();
    await channel.assertExchange("payment_events_exchange", "fanout", { durable: true });

    const queueName = "notification-service-payment-events";
    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, "payment_events_exchange", "");

    channel.consume(queueName, async (msg) => {
        if (!msg) return;

        try {
            const event: PaymentEvent = JSON.parse(msg.content.toString());

            if (event.eventId) {
                const db = await getDB();
                const [rows]: any = await db.execute("SELECT 1 FROM processed_events WHERE event_id = ?", [event.eventId]);
                if (rows.length > 0) {
                    logger.info("Event already processed, skipping", { eventId: event.eventId, eventType: event.eventType });
                    channel.ack(msg);
                    return;
                }
            }

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

            if (event.eventId) {
                const db = await getDB();
                await db.execute("INSERT IGNORE INTO processed_events (event_id) VALUES (?)", [event.eventId]);
            }

            channel.ack(msg);
        } catch (error) {
            logger.error("Payment notification failed", { error: (error as Error).message });
            channel.nack(msg, false, true);
        }
    });

    logger.info("Payment notification worker started");
};

async function handlePaymentCaptured(event: PaymentEvent) {
    const { userEmail, bookingId, amount, currency, paymentId } = event.payload;

    if (!userEmail) {
        logger.warn("No userEmail for PAYMENT_CAPTURED, skipping email", { bookingId });
        return;
    }

    try {
        const emailContent = await renderMailTemplate("payment-confirmation", {
            bookingId: bookingId,
            amount: amount,
            currency: currency,
            paymentId: paymentId,
        });

        await sendEmail(
            userEmail,
            "Payment Confirmed - Haven Booking",
            emailContent
        );

        logger.info("Payment confirmation email sent", {
            to: userEmail,
            bookingId: bookingId,
        });
    } catch (error) {
        logger.error("Failed to send payment confirmation email", {
            error: (error as Error).message,
            bookingId,
        });
    }
}

async function handlePaymentFailed(event: PaymentEvent) {
    const { userEmail, bookingId, failureReason } = event.payload;

    if (!userEmail) {
        logger.warn("No userEmail for PAYMENT_FAILED, skipping email", { bookingId });
        return;
    }

    try {
        const emailContent = await renderMailTemplate("payment-failed", {
            bookingId: bookingId,
            amount: 0,
            currency: "INR",
            failureReason: failureReason || "Payment failed",
        });

        await sendEmail(
            userEmail,
            "Payment Failed - Haven Booking",
            emailContent
        );

        logger.info("Payment failure email sent", {
            to: userEmail,
            bookingId: bookingId,
        });
    } catch (error) {
        logger.error("Failed to send payment failure email", {
            error: (error as Error).message,
            bookingId,
        });
    }
}

async function handlePaymentRefunded(event: PaymentEvent) {
    const { userEmail, bookingId, amount } = event.payload;

    if (!userEmail) {
        logger.warn("No userEmail for PAYMENT_REFUNDED, skipping email", { bookingId });
        return;
    }

    try {
        const emailContent = await renderMailTemplate("payment-refunded", {
            bookingId: bookingId,
            amount: amount,
            currency: "INR",
            paymentId: event.payload.paymentId,
        });

        await sendEmail(
            userEmail,
            "Payment Refunded - Haven Booking",
            emailContent
        );

        logger.info("Payment refund email sent", {
            to: userEmail,
            bookingId: bookingId,
        });
    } catch (error) {
        logger.error("Failed to send payment refund email", {
            error: (error as Error).message,
            bookingId,
        });
    }
}

import { getRabbitMQChannel } from '../queues/mail.queue';
import logger from '../config/logger';
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

function resolveTemplate(event: PaymentEvent): { templateId: string; subject: string; params: Record<string, any> } | null {
    const { userEmail, bookingId, amount, currency, paymentId, failureReason } = event.payload;

    if (!userEmail) {
        logger.warn("No userEmail, skipping", { eventType: event.eventType, bookingId });
        return null;
    }

    switch (event.eventType) {
        case "PAYMENT_CAPTURED":
            return {
                templateId: "payment-confirmation",
                subject: "Payment Confirmed - Haven Booking",
                params: { userEmail, bookingId, amount, currency, paymentId },
            };
        case "PAYMENT_FAILED":
            return {
                templateId: "payment-failed",
                subject: "Payment Failed - Haven Booking",
                params: { userEmail, bookingId, amount, currency, failureReason: failureReason || "Payment failed" },
            };
        case "PAYMENT_REFUNDED":
            return {
                templateId: "payment-refunded",
                subject: "Payment Refunded - Haven Booking",
                params: { userEmail, bookingId, amount, currency, paymentId },
            };
        default:
            return null;
    }
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
            const db = await getDB();

            // Dedup: already received?
            if (event.eventId) {
                const [rows]: any = await db.execute("SELECT 1 FROM processed_events WHERE event_id = ?", [event.eventId]);
                if (rows.length > 0) {
                    channel.ack(msg);
                    return;
                }
            }

            // Resolve template
            const resolved = resolveTemplate(event);
            if (!resolved) {
                if (event.eventId) {
                    await db.execute("INSERT IGNORE INTO processed_events (event_id) VALUES (?)", [event.eventId]);
                }
                channel.ack(msg);
                return;
            }

            // DB transaction: mark received + enqueue email
            const conn = await db.getConnection();
            try {
                await conn.beginTransaction();
                await conn.execute("INSERT IGNORE INTO processed_events (event_id) VALUES (?)", [event.eventId]);
                await conn.execute(
                    "INSERT IGNORE INTO email_outbox (event_id, to_email, subject, template_id, template_params) VALUES (?, ?, ?, ?, ?)",
                    [event.eventId, resolved.params.userEmail, resolved.subject, resolved.templateId, JSON.stringify(resolved.params)]
                );
                await conn.commit();
            } catch (txErr) {
                await conn.rollback();
                throw txErr;
            } finally {
                conn.release();
            }

            channel.ack(msg);
        } catch (error) {
            logger.error("Payment notification failed", { error: (error as Error).message });
            channel.nack(msg, false, true);
        }
    });

    logger.info("Payment notification worker started");
};

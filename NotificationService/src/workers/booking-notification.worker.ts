import { getRabbitMQChannel } from '../queues/mail.queue';
import logger from '../config/logger';
import { getDB } from '../lib/db';

const BOOKING_EVENTS_QUEUE = "booking-events";

interface BookingEvent {
    eventId: string;
    eventType: string;
    payload: {
        bookingId: number;
        userId: number;
        hotelId: number;
        roomId: number;
        userEmail: string;
        status: string;
        reason?: string;
        checkIn?: string;
        checkOut?: string;
    };
}

function resolveTemplate(event: BookingEvent): { templateId: string; subject: string; params: Record<string, any> } | null {
    const { userEmail, bookingId, hotelId, roomId, checkIn, checkOut, reason } = event.payload as any;

    if (!userEmail) {
        logger.warn("No userEmail, skipping", { eventType: event.eventType, bookingId });
        return null;
    }

    switch (event.eventType) {
        case "BOOKING_CONFIRMED":
            return {
                templateId: "confirm-booking",
                subject: "Booking Confirmed - Haven Booking",
                params: {
                    userEmail,
                    userName: userEmail.split("@")[0],
                    bookingId,
                    hotelName: `Hotel ${hotelId}`,
                    roomName: `Room ${roomId}`,
                    checkIn: checkIn || "N/A",
                    checkOut: checkOut || "N/A",
                },
            };
        case "BOOKING_CANCELLED":
            return {
                templateId: "booking-cancelled",
                subject: "Booking Cancelled - Haven Booking",
                params: {
                    userEmail,
                    userName: userEmail.split("@")[0],
                    bookingId,
                    reason: reason || "",
                },
            };
        case "BOOKING_EXPIRED":
            return {
                templateId: "booking-expired",
                subject: "Booking Expired - Haven Booking",
                params: {
                    userEmail,
                    userName: userEmail.split("@")[0],
                    bookingId,
                },
            };
        default:
            return null;
    }
}

export const bookingNotificationWorker = async () => {
    const channel = await getRabbitMQChannel();
    await channel.assertExchange("booking_events_exchange", "fanout", { durable: true });

    const queueName = "notification-service-booking-events";
    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, "booking_events_exchange", "");

    channel.consume(queueName, async (msg) => {
        if (!msg) return;

        try {
            const event: BookingEvent = JSON.parse(msg.content.toString());
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
            logger.error("Booking notification failed", { error: (error as Error).message });
            channel.nack(msg, false, true);
        }
    });

    logger.info("Booking notification worker started");
};

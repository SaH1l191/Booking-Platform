import { getRabbitMQChannel } from '../queues/mail.queue';
import logger from '../config/logger';
import { renderMailTemplate } from '../templates/template.hanlder';
import { sendEmail } from '../services/mail.service';

const BOOKING_EVENTS_QUEUE = "booking-events";

interface BookingEvent {
    eventType: string;
    payload: {
        bookingId: number;
        userId: number;
        hotelId: number;
        roomId: number;
        userEmail: string;
        status: string;
        reason?: string;
    };
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

            switch (event.eventType) {
                case "BOOKING_CONFIRMED":
                    await handleBookingConfirmed(event);
                    break;
                case "BOOKING_CANCELLED":
                    await handleBookingCancelled(event);
                    break;
                case "BOOKING_EXPIRED":
                    await handleBookingExpired(event);
                    break;
                default:
                    logger.info("Unhandled booking event", { eventType: event.eventType });
            }

            channel.ack(msg);
        } catch (error) {
            logger.error("Booking notification failed", { error: (error as Error).message });
            channel.nack(msg, false, true);
        }
    });

    logger.info("Booking notification worker started");
};

async function handleBookingConfirmed(event: BookingEvent) {
    const { userEmail, bookingId, hotelId, roomId, checkIn, checkOut } = event.payload as any;

    if (!userEmail) {
        logger.warn("No userEmail for BOOKING_CONFIRMED, skipping email", { bookingId });
        return;
    }

    try {
        const emailContent = await renderMailTemplate("confirm-booking", {
            userName: userEmail.split("@")[0],
            bookingId: bookingId,
            hotelName: `Hotel ${hotelId}`,
            roomName: `Room ${roomId}`,
            checkIn: checkIn || "N/A",
            checkOut: checkOut || "N/A",
        });

        await sendEmail(
            userEmail,
            "Booking Confirmed - Haven Booking",
            emailContent
        );

        logger.info("Booking confirmation email sent", {
            to: userEmail,
            bookingId: bookingId,
        });
    } catch (error) {
        logger.error("Failed to send booking confirmation email", {
            error: (error as Error).message,
            bookingId,
        });
    }
}

async function handleBookingCancelled(event: BookingEvent) {
    const { userEmail, bookingId, reason } = event.payload as any;

    if (!userEmail) {
        logger.warn("No userEmail for BOOKING_CANCELLED, skipping email", { bookingId });
        return;
    }

    try {
        const emailContent = await renderMailTemplate("payment-confirmation", {
            bookingId: bookingId,
            amount: 0,
            currency: "INR",
            paymentId: 0,
            status: "CANCELLED",
            reason: reason || "Booking cancelled",
        });

        await sendEmail(
            userEmail,
            "Booking Cancelled - Haven Booking",
            emailContent
        );

        logger.info("Booking cancellation email sent", {
            to: userEmail,
            bookingId: bookingId,
        });
    } catch (error) {
        logger.error("Failed to send booking cancellation email", {
            error: (error as Error).message,
            bookingId,
        });
    }
}

async function handleBookingExpired(event: BookingEvent) {
    const { userEmail, bookingId } = event.payload as any;

    if (!userEmail) {
        logger.warn("No userEmail for BOOKING_EXPIRED, skipping email", { bookingId });
        return;
    }

    try {
        const emailContent = await renderMailTemplate("booking-expired", {
            userName: userEmail.split("@")[0],
            bookingId: bookingId,
        });

        await sendEmail(
            userEmail,
            "Booking Expired - Haven Booking",
            emailContent
        );

        logger.info("Booking expiry email sent", {
            to: userEmail,
            bookingId: bookingId,
        });
    } catch (error) {
        logger.error("Failed to send booking expiry email", {
            error: (error as Error).message,
            bookingId,
        });
    }
}

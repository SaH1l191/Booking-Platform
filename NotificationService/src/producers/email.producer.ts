import { NotificationDTO } from "../dto/notification.dto"
import { getRabbitMQChannel } from "../queues/mail.queue"
import logger from "../config/logger"

export const MAIL_PAYLOAD = "payload-mail"
export const CONFIRM_BOOKING_PAYLOAD = "confirm-booking";

const EMAIL_QUEUE = "email_queue";

export const addEmailToQueue = async (notification: NotificationDTO) => {
    const channel = await getRabbitMQChannel();
    channel.sendToQueue(EMAIL_QUEUE, Buffer.from(JSON.stringify(notification)), {
        persistent: true,
        contentType: 'application/json',
    });
    logger.info("Email job published to RabbitMQ", { to: notification.to, subject: notification.subject });
}

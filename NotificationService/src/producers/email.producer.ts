import { NotificationDTO } from "../dto/notification.dto"
import { mailQueue } from "../queues/mail.queue"
import logger from "../config/logger"

export const MAIL_PAYLOAD = "payload-mail"
export const CONFIRM_BOOKING_PAYLOAD = "confirm-booking";


export const addEmailToQueue = async (notification: NotificationDTO) => {
    await mailQueue.add(MAIL_PAYLOAD, notification)
    logger.info("Email job added to queue", { to: notification.to, subject: notification.subject });
}


import { mailQueue } from "../queues/mail-queue"
import { confirmBookingEmailParams } from '../dto/notification.dto';
import logger from '../config/logger';

export const CONFIRM_BOOKING_PAYLOAD = "confirm-booking";

export const addEmailToQueue = async (notification: confirmBookingEmailParams) => {
    await mailQueue.add(CONFIRM_BOOKING_PAYLOAD, notification)
    logger.info("Email job added to queue", { to: notification.to, subject: notification.subject });
}

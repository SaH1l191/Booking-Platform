
import { mailQueue } from "../queues/mail-queue"
import { confirmBookingEmailParams } from '../dto/notification.dto';

export const CONFIRM_BOOKING_PAYLOAD = "confirm-booking";

export const addEmailToQueue = async (notification: confirmBookingEmailParams) => {
    await mailQueue.add(CONFIRM_BOOKING_PAYLOAD, notification)
    console.log(`Email job added to queue for ${JSON.stringify(notification)}`)
}

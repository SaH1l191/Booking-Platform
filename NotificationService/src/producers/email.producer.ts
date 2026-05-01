import { NotificationDTO } from "../dto/notification.dto"
import { mailQueue } from "../queues/mail.queue"

export const MAIL_PAYLOAD = "payload-mail"

export const addEmailToQueue = async (notification: NotificationDTO) => {
    await mailQueue.add(MAIL_PAYLOAD, notification)
    console.log(`Email job added to queue for ${JSON.stringify(notification)}`)
}
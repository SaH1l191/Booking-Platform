import { NotificationDTO } from '../dto/notification.dto';
import { MAIL_QUEUE } from '../queues/mail.queue';
import { getRedisConnObject } from '../config/redis.config';
import { Job, Worker } from 'bullmq';
import { CONFIRM_BOOKING_PAYLOAD, MAIL_PAYLOAD } from '../producers/email.producer';
import logger from '../config/logger';
import { renderMailTemplate } from '../templates/template.hanlder';
import { sendEmail } from '../services/mail.service';



export const emailWorker = () => {

    const emailProcessor = new Worker<NotificationDTO>(
        MAIL_QUEUE,
        async (job: Job) => {
            if (job.name !== MAIL_PAYLOAD && job.name !== CONFIRM_BOOKING_PAYLOAD) {
                throw new Error(`Unknown job type: ${job.name}`)
            }
            const payload = job.data as NotificationDTO
            switch (job.name) {
                case MAIL_PAYLOAD: {
                    const emailContent = await renderMailTemplate(payload.templateId, payload.params);
                    await sendEmail(payload.to, payload.subject, emailContent);
                    logger.info(`Welcome email sent to ${payload.to}`);
                    break;
                }
                case CONFIRM_BOOKING_PAYLOAD: {
                    const emailContent = await renderMailTemplate("confirm-booking", payload.params);
                    await sendEmail(payload.to, payload.subject, emailContent);
                    logger.info(`Booking confirmation email sent to ${payload.to}`);
                    break;
                }
                default:
                    throw new Error(`Unknown job type: ${job.name}`);
            }
        },
        { connection: getRedisConnObject() }
    )

    emailProcessor.on("failed", (job, err) => {
        console.error("Email processing failed", {
            jobId: job?.id,
            templateId: job?.data?.templateId,
            error: err?.message
        });
    });

    emailProcessor.on("completed", () => {
        console.log("Email processing completed successfully");
    });
} 
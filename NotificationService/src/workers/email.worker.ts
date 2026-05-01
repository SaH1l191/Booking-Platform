import { NotificationDTO } from '../dto/notification.dto';
import { MAIL_QUEUE } from '../queues/mail.queue';
import { getRedis } from '../config/redis.config';
import { Job, Worker } from 'bullmq';
import { MAIL_PAYLOAD } from '../producers/email.producer';
import logger from '../config/logger';
import { renderMailTemplate } from '../templates/template.hanlder';
import { sendEmail } from '../services/mail.service';



export const emailWorker = () => {

    const emailProcessor = new Worker<NotificationDTO>(
        MAIL_QUEUE,
        async (job: Job) => {
            if (job.name !== MAIL_PAYLOAD) {
                throw new Error(`Unknown job type: ${job.name}`)
            }
            const payload = job.data as NotificationDTO
            console.log(`Processing email job for ${JSON.stringify(payload)}`)

            const emailContent = await renderMailTemplate(payload.templateId, payload.params)
            await sendEmail(payload.to, payload.subject, emailContent)
            logger.info(`Email sent to ${payload.to} with subject ${payload.subject}`)
        },
        {
            connection: getRedis()
        }
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
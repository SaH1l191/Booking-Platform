import { NotificationDTO } from '../dto/notification.dto';
import { getRabbitMQChannel } from '../queues/mail.queue';
import logger from '../config/logger';
import { renderMailTemplate } from '../templates/template.hanlder';
import { sendEmail } from '../services/mail.service';

const EMAIL_QUEUE = "email_queue";

export const emailWorker = async () => {
    const channel = await getRabbitMQChannel();
    await channel.assertQueue(EMAIL_QUEUE, { durable: true });

    channel.consume(EMAIL_QUEUE, async (msg) => {
        if (!msg) return;

        const payload: NotificationDTO = JSON.parse(msg.content.toString());
        try {
            const emailContent = await renderMailTemplate(payload.templateId, payload.params);
            await sendEmail(payload.to, payload.subject, emailContent);
            channel.ack(msg);
            logger.info("Email sent via RabbitMQ consumer", { to: payload.to });
        } catch (error) {
            logger.error("Email processing failed", { error: (error as Error).message });
            channel.nack(msg, false, true);//on encounter of fatal error -> discard the msg / requeue= true
        }
    });
    logger.info("RabbitMQ email consumer started");
}

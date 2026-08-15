import { getDB } from '../lib/db';
import { renderMailTemplate } from '../templates/template.hanlder';
import { sendEmail } from '../services/mail.service';
import logger from '../config/logger';

const POLL_INTERVAL_MS = 10_000;
const BATCH_SIZE = 10;

interface EmailOutboxRow {
    id: number;
    event_id: string;
    to_email: string;
    subject: string;
    template_id: string;
    template_params: string;
    attempts: number;
    max_attempts: number;
}

async function processRow(row: EmailOutboxRow) {
    const db = await getDB();
    const params = typeof row.template_params === 'string' ? JSON.parse(row.template_params) : row.template_params;

    try {
        const html = await renderMailTemplate(row.template_id, params);
        await sendEmail(row.to_email, row.subject, html);

        await db.execute("UPDATE email_outbox SET status = 'SENT', updated_at = NOW() WHERE id = ?", [row.id]);
        logger.info("Email sent", { id: row.id, to: row.to_email, subject: row.subject });
    } catch (error) {
        const nextAttempts = row.attempts + 1;
        const backoffSeconds = Math.min(30 * Math.pow(2, row.attempts), 3600);
        const errorMsg = (error as Error).message;

        if (nextAttempts >= row.max_attempts) {
            await db.execute(
                "UPDATE email_outbox SET status = 'FAILED', attempts = ?, last_error = ?, updated_at = NOW() WHERE id = ?",
                [nextAttempts, errorMsg, row.id]
            );
            logger.error("Email permanently failed", { id: row.id, to: row.to_email, attempts: nextAttempts, error: errorMsg });
        } else {
            await db.execute(
                "UPDATE email_outbox SET attempts = ?, last_error = ?, next_retry_at = DATE_ADD(NOW(), INTERVAL ? SECOND), updated_at = NOW() WHERE id = ?",
                [nextAttempts, errorMsg, backoffSeconds, row.id]
            );
            logger.warn("Email retry scheduled", { id: row.id, to: row.to_email, attempt: nextAttempts, retryIn: backoffSeconds });
        }
    }
}

async function poll() {
    try {
        const db = await getDB();
        const [rows]: any = await db.execute(
            `SELECT id, event_id, to_email, subject, template_id, template_params, attempts, max_attempts FROM email_outbox WHERE status = 'PENDING' AND (next_retry_at IS NULL OR next_retry_at <= NOW()) AND attempts < max_attempts ORDER BY created_at ASC LIMIT ${BATCH_SIZE}`,
            []
        );

        for (const row of rows) {
            await processRow(row);
        }
    } catch (error) {
        logger.error("Email sender poll error", { error: (error as Error).message });
    }
}

export function startEmailSenderWorker() {
    logger.info("Email sender worker started");
    setInterval(poll, POLL_INTERVAL_MS);
}

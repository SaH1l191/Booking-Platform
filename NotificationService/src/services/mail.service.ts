
import { serverConfig } from "../config";
import logger from "../config/logger";
import transporter from "../config/mail.config";
import { InternalServerError } from "../utils/errors/app.error";
export async function sendEmail(to: string, subject: string, body: string) {
    try {
        await transporter.sendMail({
            from: serverConfig.MAIL_USER!,
            to,
            subject,
            html: body
        });
        logger.info("Email sent successfully", { to, subject });
    } catch (error) {
        logger.error("Failed to send email", { to, subject, error: (error as Error).message });
        throw new InternalServerError(`Failed to send email`);
    }
}

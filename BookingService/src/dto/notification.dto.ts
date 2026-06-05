export interface confirmBookingEmailParams {
    to: string;
    subject: string;
    templateId: string;
    params: Record<string, any>;
}
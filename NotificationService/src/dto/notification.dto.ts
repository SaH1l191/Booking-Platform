export interface NotificationDTO {
    to : string;
    subject : string;
    templateId : string;
    params : Record<string, any>;
}
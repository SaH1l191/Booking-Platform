import winston from "winston";
import path from "path";

const SERVICE_NAME = "BookingService";
const LOG_PATH = process.env.LOG_PATH || "../logs";
const LOG_FILE = path.join(LOG_PATH, "booking-service.log");

const logger = winston.createLogger({
  level: "info",

  defaultMeta: {
    service: SERVICE_NAME,
  },

  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),

  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: LOG_FILE }),
  ],
});

export default logger;

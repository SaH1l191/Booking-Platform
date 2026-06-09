import winston from "winston";

const SERVICE_NAME = "HotelService";

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
    new winston.transports.File({ filename: "C:/Users/aspha/OneDrive/Desktop/Booking-Platform-Complete/Booking-Platform/logs/hotel-service.log" }),
  ],
});

export default logger;

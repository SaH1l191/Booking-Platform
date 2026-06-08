import winston from "winston";

const SERVICE_NAME = "HotelService";

const logger = winston.createLogger({
  level: "info",

  defaultMeta: {
    service: SERVICE_NAME,
  },

  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),

  transports: [
    new winston.transports.Console(),
  ],
});

export default logger;
import winston from "winston";  

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...data }) => {
            let log = `${timestamp} [${level}]: ${message}`;
            if (Object.keys(data).length > 0) {
                log += ` ${JSON.stringify(data)}`;
            }
            return log;
        })
    ),
    transports: [
        new winston.transports.Console(),
    ]
});

export default logger;
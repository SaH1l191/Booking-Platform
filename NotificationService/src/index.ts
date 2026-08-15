import express from "express";
import helmet from "helmet";
import mysql from "mysql2/promise";
import logger from "./config/logger";
import { serverConfig } from "./config";
import { appErrorHandler, genericErrorHandler } from "./middlewares/error.middleware";
import { requestContextMiddleware } from "./middlewares/request-context.middleware";
import v1Router from "./routers/v1/index.router";
import { emailWorker } from "./workers/email.worker";
import { paymentNotificationWorker } from "./workers/payment-notification.worker";
import { bookingNotificationWorker } from "./workers/booking-notification.worker";
import { ensureProcessedEventsTable, ensureEmailOutboxTable } from "./lib/db";
import { startEmailSenderWorker } from "./workers/email-sender.worker";
import { register } from "./metrics/metrics";
import { metricsMiddleware } from "./middlewares/metrics.middleware";

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());
app.use(helmet());
app.use(requestContextMiddleware);

app.use(metricsMiddleware);
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'NotificationService', timestamp: new Date().toISOString() });
});
app.use('/api/v1', v1Router);
app.use(appErrorHandler)
app.use(genericErrorHandler)

async function ensureDatabase() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root",
  });
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_DATABASE || "airbnb_development"}\``
  );
  await conn.end();
  logger.info("Database ensured");
}

app.listen(PORT, async () => {
  logger.info("Notification Server starting...", { port: serverConfig.PORT });

  try {
    await ensureDatabase();
    await ensureProcessedEventsTable();
    await ensureEmailOutboxTable();
    logger.info("Database initialized");
  } catch (error) {
    logger.error("Failed to initialize database", { error: (error as Error).message });
    process.exit(1);
  }

  emailWorker()
  paymentNotificationWorker();
  bookingNotificationWorker();
  startEmailSenderWorker();
  logger.info("Workers started successfully");
});


                        //  PAYMENT SERVICE
                              //  │
                              //  │
                    //  PAYMENT_CAPTURED
                              //  │
                              //  ▼
                    // RabbitMQ Exchange
                  // payment_events_exchange
                              //  │
                              //  ▼
              // notification-service-payment-events
                              //  │
                              //  ▼
                    // Notification Worker
                              //  │
                              //  ▼
                    // Parse event JSON
                              //  │
                              //  ▼
                    // Check processed_events
                        //  /          \
                      //  YES           NO
                        // │             │
                      //  ACK            ▼
                                // switch(eventType)
                                      // │
                      //  ┌──────────────┼──────────────┐
                      //  ▼              ▼              ▼
                // PAYMENT_CAPTURED PAYMENT_FAILED PAYMENT_REFUNDED
                      //  │              │              │
                      //  ▼              ▼              ▼
                    // Resolve        Resolve        Resolve
                    // template        template       template
                      //  │              │              │
                      //  └──────────────┼──────────────┘
                                      // ▼
                    // DB Transaction {
                    //   INSERT processed_events
                    //   INSERT email_outbox
                    // }
                                      // │
                                      // ▼
                                    // ACK
                                      // │
                                      // ▼
                          // Email Sender (polling 10s)
                                      // │
                                      // ▼
                          // SELECT * FROM email_outbox
                          // WHERE status = 'PENDING'
                                      // │
                                      // ▼
                          // renderMailTemplate()
                          // sendEmail()
                                      // │
                          //    ┌───────┴───────┐
                          //    ▼               ▼
                          // SUCCESS          FAILURE
                          //    │               │
                          //    ▼               ▼
                          // status=SENT    retry with
                          //                backoff
                          //                (max 5x)
                          //                    │
                          //                    ▼
                          //              status=FAILED
                          //              (manual inspect)
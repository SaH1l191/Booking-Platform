import express from "express";
import helmet from "helmet";
import logger from "./config/logger";
import { serverConfig } from "./config";
import { appErrorHandler, genericErrorHandler } from "./middlewares/error.middleware";
import { requestContextMiddleware } from "./middlewares/request-context.middleware";
import v1Router from "./routers/v1/index.router";
import { emailWorker } from "./workers/email.worker";
import { paymentNotificationWorker } from "./workers/payment-notification.worker";
import { bookingNotificationWorker } from "./workers/booking-notification.worker";
import { ensureProcessedEventsTable } from "./lib/db";
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

app.listen(PORT, async () => {
  logger.info("Notification Server started successfully", { port: serverConfig.PORT });
  await ensureProcessedEventsTable();
  emailWorker()
  paymentNotificationWorker();
  bookingNotificationWorker();
  logger.info("Workers started successfully");
});

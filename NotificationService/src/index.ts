import express from "express";
import helmet from "helmet";
import logger from "./config/logger";
import { serverConfig } from "./config";
import { appErrorHandler, genericErrorHandler } from "./middlewares/error.middleware";
import v1Router from "./routers/v1/index.router";
import { emailWorker } from "./workers/email.worker";
import { paymentNotificationWorker } from "./workers/payment-notification.worker";
import { bookingNotificationWorker } from "./workers/booking-notification.worker";
import { register } from "./metrics/metrics";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(helmet());

app.use((req, res, next) => {
  logger.info("Incoming request", { method: req.method, path: req.path, query: req.query });
  next();
});


app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
app.use('/api/v1', v1Router);
app.use(appErrorHandler)
app.use(genericErrorHandler)

app.listen(PORT, async () => {
  logger.info("Notification Server started successfully", { port: serverConfig.PORT });
  emailWorker()
  paymentNotificationWorker();
  bookingNotificationWorker();
  logger.info("Workers started successfully");
});

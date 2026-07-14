import express from "express";
import helmet from "helmet";
import dotenv from "dotenv";
import { appErrorHandler, genericErrorHandler } from "./middlewares/error.middleware";
import v1Router from "./routers/v1/routes";
import { serverConfig } from "./config/index";
import logger from "./config/logger";
import { metricsMiddleware } from "./middlewares/metrics.middleware";
import { register } from "./metrics/metrics";
import { startOutboxPublisher } from "./workers/outbox-publisher";
import { startPaymentEventConsumer } from "./workers/payment-event-consumer";

dotenv.config();

const app = express();
app.use(express.json());
app.use(helmet());

app.use((req, res, next) => {
  logger.info("Incoming request", { method: req.method, path: req.path, query: req.query });
  next();
});
app.use(metricsMiddleware);
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use(v1Router);
app.use(appErrorHandler);
app.use(genericErrorHandler);

const server = app.listen(serverConfig.port, async () => {
  logger.info("Booking Service started successfully", { port: serverConfig.port });

  startOutboxPublisher();
  // startPaymentEventConsumer();
  logger.info("All BookingService workers started");
});

async function gracefulShutdown(signal: string) {
  logger.info("Graceful shutdown initiated", { signal });
  server.close(async (err) => {
    if (err) {
      logger.error("Error while closing server", { error: err.message });
      process.exit(1);
    }
    logger.info("Graceful shutdown completed");
    process.exit(0);
  });
}

process.on("SIGINT", () => { gracefulShutdown("SIGINT"); });
process.on("SIGTERM", () => { gracefulShutdown("SIGTERM"); });

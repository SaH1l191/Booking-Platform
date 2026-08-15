import express from "express";
import helmet from "helmet";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { appErrorHandler, genericErrorHandler } from "./middlewares/error.middleware";
import { requestContextMiddleware } from "./middlewares/request-context.middleware";
import v1Router from "./routers/v1/routes";
import { serverConfig } from "./config/index";
import logger from "./config/logger";
import { metricsMiddleware } from "./middlewares/metrics.middleware";
import { register } from "./metrics/metrics";
import { startOutboxPublisher } from "./workers/outbox-publisher";
import { startPaymentEventConsumer, stopPaymentEventConsumer } from "./workers/payment-event-consumer";
import { prisma } from "./lib/prisma";
import { redisClient } from "./config/redis.config";
import { closeRabbitMQ } from "./queues/event-queue";
import { startBookingExpiryWorker, stopBookingExpiryWorker } from "./workers/booking-expiry-worker";

dotenv.config();

async function ensureDatabase() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root",
  });
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || "airbnb_development1"}\``
  );
  await conn.end();
  logger.info("Database ensured");
}

async function runMigrations() {
  const { execSync } = require("child_process");
  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    execSync("npx prisma generate", { stdio: "inherit" });
    logger.info("Prisma migrations completed");
  } catch (error) {
    logger.error("Failed to run Prisma migrations", { error: (error as Error).message });
    throw error;
  }
}

async function runSeeds() {
  const { execSync } = require("child_process");
  try {
    execSync("npx prisma db seed", { stdio: "inherit" });
    logger.info("Prisma seeds completed");
  } catch (error) {
    logger.warn("Seed warning (may already be seeded)", { error: (error as Error).message });
  }
}

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(helmet());
app.use(requestContextMiddleware);
app.use(metricsMiddleware);
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'BookingService', timestamp: new Date().toISOString() });
});

app.use(v1Router);
app.use(appErrorHandler);
app.use(genericErrorHandler);

const server = app.listen(serverConfig.port, async () => {
  logger.info("Booking Service starting...", { port: serverConfig.port });

  try {
    await ensureDatabase();
    await runMigrations();
    await runSeeds();
    await prisma.$connect();
    logger.info("Database connected and migrations applied");
  } catch (error) {
    logger.error("Failed to initialize database", { error: (error as Error).message });
    process.exit(1);
  }

  startOutboxPublisher();
  startPaymentEventConsumer();
  startBookingExpiryWorker();
  logger.info("All BookingService workers started");
});

async function gracefulShutdown(signal: string) {
  logger.info("Graceful shutdown initiated", { signal });
  server.close(async (err) => {
    if (err) {
      logger.error("Error while closing server", { error: err.message });
      process.exit(1);
    }

    stopBookingExpiryWorker();
    stopPaymentEventConsumer();

    try {
      await prisma.$disconnect();
      logger.info("Prisma disconnected");
    } catch (error) {
      logger.error("Error disconnecting Prisma", { error: (error as Error).message });
    }

    try {
      await redisClient.quit();
      logger.info("Redis disconnected");
    } catch (error) {
      logger.error("Error disconnecting Redis", { error: (error as Error).message });
    }

    try {
      await closeRabbitMQ();
    } catch (error) {
      logger.error("Error closing RabbitMQ", { error: (error as Error).message });
    }

    logger.info("Graceful shutdown completed");
    process.exit(0);
  });
}

process.on("SIGINT", () => { gracefulShutdown("SIGINT"); });
process.on("SIGTERM", () => { gracefulShutdown("SIGTERM"); });

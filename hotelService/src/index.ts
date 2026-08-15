import "./db/models/associations";
import express from "express";
import helmet from "helmet";
import mysql from "mysql2/promise";
import logger from "./config/logger";
import { serverConfig, dbConfig } from "./config";
import {
  appErrorHandler,
  genericErrorHandler,
} from "./middlewares/error.middleware";
import { requestContextMiddleware } from "./middlewares/request-context.middleware";
import v1Router from "./routers/v1/index.router";
import sequelize from "./db/models/sequelize";
import { register } from "./metrics/metrics";
import { metricsMiddleware } from "./middlewares/metrics.middleware";

const app = express();
const PORT = serverConfig.PORT;

app.use(express.json({ limit: '10mb' }));
app.use(helmet());
app.use(requestContextMiddleware);
app.use(metricsMiddleware);
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hotelService', timestamp: new Date().toISOString() });
});

app.use("/api/v1", v1Router);

app.use(appErrorHandler);
app.use(genericErrorHandler);

async function ensureDatabase() {
  const conn = await mysql.createConnection({
    host: dbConfig.DB_HOST,
    user: dbConfig.DB_USER,
    password: dbConfig.DB_PASSWORD,
  });
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbConfig.DB_NAME}\``
  );
  await conn.end();
  logger.info("Database ensured");
}

async function runMigrations() {
  const { execSync } = require("child_process");
  try {
    execSync("npx sequelize-cli db:migrate", { stdio: "inherit" });
    logger.info("Sequelize migrations completed");
  } catch (error) {
    logger.error("Failed to run Sequelize migrations", { error: (error as Error).message });
    throw error;
  }
}

async function runSeeds() {
  const { execSync } = require("child_process");
  try {
    execSync("npx sequelize-cli db:seed:all", { stdio: "inherit" });
    logger.info("Sequelize seeds completed");
  } catch (error) {
    logger.warn("Seed warning (may already be seeded)", { error: (error as Error).message });
  }
}

const server = app.listen(PORT, async () => {
  logger.info("Hotel Service starting...", { port: PORT });

  try {
    await ensureDatabase();
    await runMigrations();
    await runSeeds();
    await sequelize.authenticate();
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error("Unable to connect to the database", { error: (error as Error).message });
    process.exit(1);
  }
});

async function gracefulShutdown(signal: string) {
  logger.info("Graceful shutdown initiated", { signal });

  server.close(async (err) => {
    if (err) {
      logger.error("Error while closing server", { error: err.message });
      process.exit(1);
    }

    try {
      await sequelize.close();
      logger.info("Database connection closed");
    } catch (error) {
      logger.error("Error closing database connection", { error: (error as Error).message });
    }

    logger.info("Graceful shutdown completed");
    process.exit(0);
  });
}

process.on("SIGINT", () => { gracefulShutdown("SIGINT"); });
process.on("SIGTERM", () => { gracefulShutdown("SIGTERM"); });

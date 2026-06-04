import express from "express";
import logger from "./config/logger";
import { serverConfig } from "./config";
import {
  appErrorHandler,
  genericErrorHandler,
} from "./middlewares/error.middleware";
import v1Router from "./routers/v1/index.router";
import sequelize from "./db/models/sequelize";

const app = express();
const PORT = serverConfig.PORT; 

app.use(express.json());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { query: req.query, body: req.body });
  next();
});

app.use("/api/v1", v1Router);

app.use(appErrorHandler);
app.use(genericErrorHandler);

const server = app.listen(PORT, async () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
  logger.info("Hotel Service started successfully");

  try {
    await sequelize.authenticate();
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error("Unable to connect to the database:", error);
  }
});

async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async (err) => {
    if (err) {
      logger.error("Error while closing server:", err);
      process.exit(1);
    }

    try {
      await sequelize.close();
      logger.info("Database connection closed");
    } catch (error) {
      logger.error("Error closing database connection:", error);
    }

    logger.info("Graceful shutdown completed");
    process.exit(0);
  });
}

process.on("SIGINT", () => { gracefulShutdown("SIGINT"); });
process.on("SIGTERM", () => { gracefulShutdown("SIGTERM"); });
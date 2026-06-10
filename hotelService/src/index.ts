import "./db/models/associations";
import express from "express";
import helmet from "helmet"; 
import logger from "./config/logger";
import { serverConfig } from "./config";
import {
  appErrorHandler,
  genericErrorHandler,
} from "./middlewares/error.middleware";
import v1Router from "./routers/v1/index.router";
import sequelize from "./db/models/sequelize";
import { register } from "./metrics/metrics"; 

const app = express();
const PORT = serverConfig.PORT; 

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

app.use("/api/v1", v1Router);

app.use(appErrorHandler);
app.use(genericErrorHandler);

const server = app.listen(PORT, async () => {
  logger.info("Hotel Service started successfully", { port: PORT });

  try {
    await sequelize.authenticate();
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error("Unable to connect to the database", { error: (error as Error).message });
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

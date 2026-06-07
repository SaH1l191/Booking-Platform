import express from "express";
import helmet from "helmet"; // Helmet adds security headers (CSP, XSS protection, HSTS, click‑jacking prevention, etc.)
import dotenv from "dotenv";
import { appErrorHandler, genericErrorHandler } from "./middlewares/error.middleware";
import v1Router from "./routers/v1/routes";
import { serverConfig } from "./config/index";
import logger from "./config/logger";
dotenv.config();

const app = express();
app.use(express.json());
// Apply Helmet to set secure HTTP headers (prevents XSS, click‑jacking, MIME sniffing, etc.)
app.use(helmet());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { query: req.query, body: req.body });
  next();
});

app.use(v1Router);
app.use(appErrorHandler);
app.use(genericErrorHandler);


//docker run -d --name my-redis -p 6379:6379 redis:latest   


const server = app.listen(serverConfig.port, async () => {
  logger.info("Booking Service started successfully");
  logger.info(`Server is running on http://localhost:${serverConfig.port}`);

});

async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async (err) => {
    if (err) {
      logger.error("Error while closing server:", err);
      process.exit(1);
    }
    logger.info("Graceful shutdown completed");
    process.exit(0);
  });
}

process.on("SIGINT", () => { gracefulShutdown("SIGINT"); });
process.on("SIGTERM", () => { gracefulShutdown("SIGTERM"); });

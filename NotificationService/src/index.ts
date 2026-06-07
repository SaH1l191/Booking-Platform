import express from "express";
import helmet from "helmet"; // Helmet adds security headers (CSP, XSS protection, HSTS, click‑jacking prevention, etc.)
import logger from "./config/logger";
import { serverConfig } from "./config";
import { appErrorHandler, genericErrorHandler } from "./middlewares/error.middleware";
import v1Router from "./routers/v1/index.router"; 
import { emailWorker } from "./workers/email.worker";

const app = express(); 
const PORT = process.env.PORT || 5000; 
 
app.use(express.json());
// Apply Helmet to set secure HTTP headers (prevents XSS, click‑jacking, MIME sniffing, etc.)
app.use(helmet());
app.get("/", (req, res) => res.send("Welcome"))
app.use('/api/v1', v1Router);
app.use(appErrorHandler)
app.use(genericErrorHandler)

app.listen(PORT, async () => {
  logger.info(`NOtification Server is running on http://localhost:${serverConfig.PORT}`);
  logger.info(`Press Ctrl+C to stop the server.`);
  emailWorker() 
  logger.info(`Email worker started successfully.`);
}); 
 

import crypto from "crypto";
import logger from "../config/logger";

const SERVICE_NAME = "HotelService";

export const requestContextMiddleware = (req: any, res: any, next: any) => {
  const requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  const originalPath = (req.headers["x-original-path"] as string) || req.path;

  req.requestId = requestId;
  req.originalPath = originalPath;

  const start = Date.now();

  res.on("finish", () => {
    logger.info("HTTP Request", {
      requestId,
      method: req.method,
      route: originalPath,
      status: res.statusCode,
      latency: Date.now() - start,
      service: SERVICE_NAME,
    });
  });

  next();
};

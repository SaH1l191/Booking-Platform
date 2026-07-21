import logger from "../config/logger";

export const requestContextMiddleware = (req: any, res: any, next: any) => {
  const requestId = (req.headers["x-request-id"] as string) || "";
  const originalPath = (req.headers["x-original-path"] as string) || req.path;
  logger.info("Incoming request", {
    method: req.method,
    path: req.path,
    query: req.query,
    request_id: requestId,
    original_path: originalPath,
  });
  next();
};

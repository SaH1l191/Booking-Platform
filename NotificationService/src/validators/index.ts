// src/validators/index.ts
import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { BadRequestError } from "../utils/errors/app.error";
import logger from "../config/logger";
 
export const validateSchemaBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
  
    if (!req.body || Object.keys(req.body).length === 0) {
      return next(
        new BadRequestError("Request body is required and must be valid JSON")
      );
    } 
    logger.info("Validating request body");
    const result = schema.safeParse(req.body);
    if (!result.success) { 
      const messages = result.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join(", ");
      return next(new BadRequestError(messages));
    } 
    req.body = result.data; 
    return next();
  };
};

// src/validators/index.ts
import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { BadRequestError } from "../utils/errors/app.error";

export const validateSchemaBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      return next(new BadRequestError("Request body is required"));
    }
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return next(new BadRequestError(messages));
    }
    req.body = result.data;
    return next();
  };
};

export const validateSchemaQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const messages = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return next(new BadRequestError(messages));
    }
    Object.defineProperty(req, 'query', {
      value: result.data,
      enumerable: true,
      writable: true,
      configurable: true
    });
    return next();
  };
};

export const validateSchemaParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const messages = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return next(new BadRequestError(messages));
    }
    Object.defineProperty(req, 'params', {
      value: result.data,
      enumerable: true,
      writable: true,
      configurable: true
    });
    return next();
  };
};


import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/errors/app.error";
import logger from "../config/logger";

export const appErrorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
    if (typeof (err as AppError).statusCode !== "number") {
        return next(err);
    }

    logger.error(`App Error: ${err.message}`, {
        statusCode: err.statusCode,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    res.status(err.statusCode).json({
        success: false,
        message: err.message
    });
}

export const genericErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        logger.error(`Prisma Error: ${err.message}`, {
            code: err.code,
            path: req.path,
            method: req.method
        });

        const statusCode = err.code === "P2025" ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            message: err.code === "P2025" ? "Resource not found" : "Database error"
        });
        return;
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
        logger.error(`Prisma Validation Error: ${err.message}`, {
            path: req.path,
            method: req.method
        });
        res.status(400).json({
            success: false,
            message: "Invalid data provided"
        });
        return;
    }

    logger.error(`Unhandled Error: ${err.message}`, {
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
}
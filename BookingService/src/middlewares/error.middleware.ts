import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors/app.error.js";

export const appErrorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
    if (typeof (err as AppError).statusCode !== "number") {
        return next(err);
    }

    console.log(err);
    res.status(err.statusCode).json({
        success: false,
        message: err.message
    });
}

export const genericErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.log(err);
    res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
}
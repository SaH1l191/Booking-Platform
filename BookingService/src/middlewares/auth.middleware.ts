import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger.config';

export interface AuthRequest extends Request {
    userId?: number;
    email?: string;
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'];
    const email = req.headers['x-user-email'];
    logger.info("Auth Middleware - User ID:", userId, "Email:", email);
    if (!userId) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }

    req.userId = Number(userId);
    req.email = String(email);

    next();
}
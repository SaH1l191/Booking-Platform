import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
    userId?: number;
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }

    req.userId = Number(userId);

    next();
}
import { Request, Response, NextFunction } from 'express';


export interface AuthRequest extends Request {
    user?: any;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.headers["x-user-id"];

    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = {
        userId: req.headers["x-user-id"],
        email: req.headers["x-user-email"],
        roles: (req.headers["x-user-role"] as string || "").split(",").filter(Boolean),
    };
    next()
};


import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request { 
    user?: any;  
}
 

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"]; 
    logger.info("Authenticating user",  req.headers);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];

    try {
        const secret = process.env.JWT_ACCESS_SECRET || "secret";
        const decoded = jwt.verify(token, secret!);
        req.user = decoded
        logger.info("User authenticated", req.user);
        next();
    }
    catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
}
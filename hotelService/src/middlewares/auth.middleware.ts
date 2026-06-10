import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import logger from "../config/logger"; 

export interface AuthRequest extends Request {
    user?: any;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"]; 
    logger.info("Authenticating user", { hasAuthHeader: !!authHeader });
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];

    try {
        const secret = process.env.JWT_ACCESS_SECRET || "secret";
        const decoded = jwt.verify(token, secret!);
        logger.info("Token decoded successfully", { decoded });
        req.user = decoded
        logger.info("User authenticated", { userId: req.user.userId });
        next();
    }
    catch (err) {
        logger.error("Invalid token", { error: err });
        return res.status(401).json({ message: "Invalid token" });
    }
}
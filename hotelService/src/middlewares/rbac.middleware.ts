import { NextFunction, Response } from "express";
import { AuthRequest } from "./auth.middleware";
import { RolePermissions } from "./permissions";
import logger from "../config/logger";

export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const roles: string[] = req.user?.roles || [];
    logger.debug(`User roles: ${roles.join(", ")}`);
    for (const role of roles) {
      const perms = RolePermissions[role] || [];
      logger.debug(`Checking role "${role}" with permissions: ${perms.join(", ")}`);
      if (perms.includes("*") || perms.includes(permission)) {
        return next();
      }
    }
    return res.status(403).json({ error: "Forbidden: missing required permission" });
  };
};

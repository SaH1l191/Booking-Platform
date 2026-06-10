import { NextFunction, Response } from "express";
import { AuthRequest } from "./auth.middleware";
import { RolePermissions } from "./permissions";

export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const roles: string[] = req.user?.roles || [];

    for (const role of roles) {
      const perms = RolePermissions[role] || [];
      if (perms.includes("*") || perms.includes(permission)) {
        return next();
      }
    }

    return res.status(403).json({ error: "Forbidden: missing required permission" });
  };
};

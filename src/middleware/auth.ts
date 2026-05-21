import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../db/matuclient.js";
import { UnauthorizedError, ForbiddenError } from "../utils/errors.js";
import { ensureProfile } from "../services/profile.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid token");
  }

  const token = header.slice(7).trim();
  const authUser = await verifyAccessToken(token);
  const profile = await ensureProfile(authUser);

  req.userId = authUser.id;
  req.userRole = profile.role;
  req.user = profile;
  next();
});

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.userRole !== "admin") {
    return next(new ForbiddenError("Admin access required"));
  }
  next();
}

import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt";

export interface AuthedRequest extends Request {
  userId?: string;
}

function extractUserId(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  const userId = verifyToken(header.slice(7));
  return userId ?? undefined;
}

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  req.userId = extractUserId(req);
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  req.userId = userId;
  next();
}

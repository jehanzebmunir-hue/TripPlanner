import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt";

export interface AuthedRequest extends Request {
  userId?: string;
  editToken?: string;
}

// A trip's edit-permission token, sent as a plain header rather than a
// Bearer JWT -- it isn't tied to an account or a login session, just
// whoever holds the real edit link for that specific trip. See
// trips.service.ts's assertCanEdit for how this and account ownership
// combine.
export function attachEditToken(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers["x-edit-token"];
  req.editToken = typeof header === "string" && header.length > 0 ? header : undefined;
  next();
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

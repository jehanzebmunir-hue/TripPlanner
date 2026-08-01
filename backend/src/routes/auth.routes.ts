import { Router } from "express";
import { z } from "zod";
import * as authService from "../services/auth.service";
import { AuthedRequest, requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const resetRequestSchema = z.object({
  email: z.string().email(),
});

const resetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

router.post("/register", validate(credentialsSchema), async (req, res, next) => {
  try {
    res.json(await authService.register(req.body.email, req.body.password));
  } catch (err) {
    next(err);
  }
});

router.post("/login", validate(credentialsSchema), async (req, res, next) => {
  try {
    res.json(await authService.login(req.body.email, req.body.password));
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    res.json(await authService.getUser(req.userId!));
  } catch (err) {
    next(err);
  }
});

router.delete("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    await authService.deleteAccount(req.userId!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post("/reset-request", validate(resetRequestSchema), async (req, res, next) => {
  try {
    await authService.requestPasswordReset(req.body.email);
    // Same response whether or not the email is registered — see the
    // service-layer comment on why this can't reveal that.
    res.json({ message: "If that email is registered, a reset link has been sent." });
  } catch (err) {
    next(err);
  }
});

router.post("/reset-confirm", validate(resetConfirmSchema), async (req, res, next) => {
  try {
    await authService.confirmPasswordReset(req.body.token, req.body.newPassword);
    res.json({ message: "Password updated." });
  } catch (err) {
    next(err);
  }
});

export default router;

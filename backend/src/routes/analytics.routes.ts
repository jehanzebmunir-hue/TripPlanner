import { Router } from "express";
import { recordEvent } from "../services/analytics.service";

const router = Router();

// No auth required (this app has no accounts most users ever create) and
// no response body worth returning -- a client that's tracking a real
// interaction shouldn't need to wait on or handle a payload back.
router.post("/", async (req, res, next) => {
  try {
    await recordEvent(req.body?.name, req.body?.context);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;

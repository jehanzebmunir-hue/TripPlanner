import { Router } from "express";
import { getExchangeRate } from "../lib/exchangeRates";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const from = String(req.query.from ?? "");
    const to = String(req.query.to ?? "");
    if (!from || !to) {
      res.status(400).json({ error: "from and to are required currency codes" });
      return;
    }

    const rate = await getExchangeRate(from, to);
    // rate: null is a real, expected response (no provider connected, or
    // the provider didn't have this pair) — not an error. A caller should
    // treat null as "show the native price only," not retry or alert.
    res.json({ from, to, rate });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router } from "express";
import { getCityHealth } from "../services/ingestion.service";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const city = String(req.query.city ?? "");
    if (!city) return res.json([]);
    res.json(await getCityHealth(city));
  } catch (err) {
    next(err);
  }
});

export default router;

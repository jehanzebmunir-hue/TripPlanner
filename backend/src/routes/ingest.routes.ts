import { Router } from "express";
import { ingestCity } from "../services/ingestion.service";

const router = Router();

router.post("/:city", async (req, res, next) => {
  try {
    res.json(await ingestCity(req.params.city));
  } catch (err) {
    next(err);
  }
});

export default router;

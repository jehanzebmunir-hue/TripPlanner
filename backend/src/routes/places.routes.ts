import { Router } from "express";
import { confirmPlace, listPlaces } from "../services/places.service";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const city = String(req.query.city ?? "nyc");
    const category = req.query.category ? String(req.query.category) : undefined;
    const tier = req.query.tier ? String(req.query.tier) : undefined;
    res.json(await listPlaces(city, { category, tier }));
  } catch (err) {
    next(err);
  }
});

router.post("/:id/confirm", async (req, res, next) => {
  try {
    const vote = req.body.vote === "invalid" ? "invalid" : "valid";
    res.json(await confirmPlace(req.params.id, vote));
  } catch (err) {
    next(err);
  }
});

export default router;

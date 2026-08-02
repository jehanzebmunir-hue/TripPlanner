import { Router } from "express";
import { listAllCities, searchCities } from "../services/cityResolution.service";

const router = Router();

router.get("/", async (_req, res) => {
  res.json(await listAllCities());
});

// Registry-first, then previously-resolved cities, live Nominatim geocoding
// only as a last resort -- see cityResolution.service.ts's searchCities.
router.get("/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  res.json(await searchCities(q));
});

export default router;

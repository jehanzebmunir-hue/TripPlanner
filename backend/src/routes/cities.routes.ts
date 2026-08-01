import { Router } from "express";
import { CITIES } from "../config/cities";
import { getCurrency, getTimezone } from "../config/localization";

const router = Router();

router.get("/", (_req, res) => {
  res.json(
    CITIES.map((city) => ({
      slug: city.slug,
      name: city.name,
      country: city.country,
      currency: getCurrency(city),
      timezone: getTimezone(city),
    }))
  );
});

export default router;

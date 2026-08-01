import { Router } from "express";
import { BudgetTier } from "../config/travelProfile";
import { recommendDestinations, VIBE_OPTIONS } from "../services/destinationRecommender.service";

const router = Router();

const VALID_BUDGET_TIERS: BudgetTier[] = ["budget", "moderate", "premium"];

router.get("/vibes", (_req, res) => {
  res.json(VIBE_OPTIONS.map(({ slug, label }) => ({ slug, label })));
});

router.get("/", async (req, res, next) => {
  try {
    const vibeSlug = req.query.vibe ? String(req.query.vibe) : undefined;
    const budgetRaw = req.query.budget ? String(req.query.budget) : undefined;
    const budgetTier = VALID_BUDGET_TIERS.includes(budgetRaw as BudgetTier) ? (budgetRaw as BudgetTier) : undefined;

    res.json(await recommendDestinations({ vibeSlug, budgetTier }));
  } catch (err) {
    next(err);
  }
});

export default router;

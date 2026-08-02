import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRecommendDestinations, useVibes } from "../hooks";
import { BudgetTier } from "../types";

const BUDGET_TIERS: (BudgetTier | "")[] = ["", "budget", "moderate", "premium"];
const BUDGET_KEY: Record<BudgetTier | "", string> = {
  "": "findDestination.anyBudget",
  budget: "findDestination.budgetBudget",
  moderate: "findDestination.budgetModerate",
  premium: "findDestination.budgetPremium",
};

interface Props {
  onPick: (slug: string) => void;
}

// A thin front-door for undecided travelers — narrows down to a city, then
// hands off into the exact same Setup flow with that city pre-filled. Not a
// second product: no invented crowd-score or density metrics, only ranked
// counts of real places already ingested for each vibe (see README "Two
// ways into the app" for the full reasoning).
export function FindDestinationPanel({ onPick }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [vibeSlug, setVibeSlug] = useState<string>("");
  const [budgetTier, setBudgetTier] = useState<BudgetTier | "">("");

  const { data: vibes } = useVibes();
  const { data: matches, isLoading } = useRecommendDestinations(vibeSlug || undefined, budgetTier || undefined, open);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left font-mono text-[11.5px] uppercase tracking-wide text-accent underline"
      >
        {t("findDestination.opener")}
      </button>
    );
  }

  return (
    <div className="border border-line bg-paper-raised p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-serif text-base">{t("findDestination.heading")}</h3>
          <p className="text-xs text-ink-soft">{t("findDestination.subheading")}</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="font-mono text-[11px] text-ink-faint">
          {t("common.close")}
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {vibes?.map((v) => (
          <button
            key={v.slug}
            type="button"
            onClick={() => setVibeSlug(vibeSlug === v.slug ? "" : v.slug)}
            className={`border px-3 py-1.5 text-[12.5px] ${
              vibeSlug === v.slug ? "border-accent bg-accent text-onaccent" : "border-line bg-paper text-ink-soft"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <select
        value={budgetTier}
        onChange={(e) => setBudgetTier(e.target.value as BudgetTier | "")}
        className="mb-4 w-full border border-line bg-paper px-3 py-2 text-sm"
      >
        {BUDGET_TIERS.map((b) => (
          <option key={b} value={b}>
            {t(BUDGET_KEY[b])}
          </option>
        ))}
      </select>

      {isLoading && <p className="text-xs text-ink-faint">{t("findDestination.matching")}</p>}
      {!isLoading && matches && matches.length === 0 && (
        <p className="text-xs text-ink-faint">{t("findDestination.noMatches")}</p>
      )}

      <div className="space-y-2">
        {matches?.map((m) => (
          <button
            key={m.slug}
            type="button"
            onClick={() => {
              onPick(m.slug);
              setOpen(false);
            }}
            className="block w-full border border-line bg-paper p-3 text-left hover:border-accent"
          >
            <div className="mb-0.5 flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold">{m.name}</span>
              <span className="font-mono text-[10.5px] uppercase tracking-wide text-ink-faint">
                {t(BUDGET_KEY[m.budgetTier] ?? "", m.budgetTier)}
              </span>
            </div>
            <p className="text-xs text-ink-soft">
              {m.rationale} · {t("findDestination.best", { season: m.bestSeason })}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useRecommendDestinations, useVibes } from "../hooks";
import { BudgetTier } from "../types";

const BUDGET_OPTIONS: { value: BudgetTier | ""; label: string }[] = [
  { value: "", label: "Any budget" },
  { value: "budget", label: "Budget" },
  { value: "moderate", label: "Moderate" },
  { value: "premium", label: "Premium" },
];

interface Props {
  onPick: (slug: string) => void;
}

// A thin front-door for undecided travelers — narrows down to a city, then
// hands off into the exact same Setup flow with that city pre-filled. Not a
// second product: no invented crowd-score or density metrics, only ranked
// counts of real places already ingested for each vibe (see README "Two
// ways into the app" for the full reasoning).
export function FindDestinationPanel({ onPick }: Props) {
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
        Not sure yet? Find a destination →
      </button>
    );
  }

  return (
    <div className="border border-line bg-paper-raised p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-serif text-base">Find a destination</h3>
          <p className="text-xs text-ink-soft">Ranked from what's actually ingested for each city — no made-up scores.</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="font-mono text-[11px] text-ink-faint">
          Close
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
        {BUDGET_OPTIONS.map((b) => (
          <option key={b.value} value={b.value}>
            {b.label}
          </option>
        ))}
      </select>

      {isLoading && <p className="text-xs text-ink-faint">Matching…</p>}
      {!isLoading && matches && matches.length === 0 && (
        <p className="text-xs text-ink-faint">
          No ingested cities match that combination yet — try a different vibe or budget.
        </p>
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
              <span className="font-mono text-[10.5px] uppercase tracking-wide text-ink-faint">{m.budgetTier}</span>
            </div>
            <p className="text-xs text-ink-soft">{m.rationale} · Best: {m.bestSeason}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

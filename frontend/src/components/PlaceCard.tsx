import { Place } from "../types";

const BAND_STYLES: Record<string, string> = {
  verified: "text-verified bg-verified-bg",
  aging: "text-aging bg-aging-bg",
  stale: "text-stale bg-stale-bg",
};

interface Props {
  place: Place;
  added: boolean;
  categoryLabel: string;
  currency: string;
  onToggleAdd: () => void;
  onConfirm: (vote: "valid" | "invalid") => void;
}

// Renders nothing when priceAmount is null/undefined — an unverified price
// looks identical to today's UI, on purpose, rather than showing a
// confusing "price unknown" placeholder for what's still most of the data.
function formatPrice(amount: number | null | undefined, currency: string): string | null {
  if (amount == null) return null;
  if (amount === 0) return "Free";
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function PlaceCard({ place, added, categoryLabel, currency, onToggleAdd, onConfirm }: Props) {
  const badgeLabel = place.band === "stale" ? `Stale · ${place.daysSince}d ago` : `Verified ${place.daysSince}d ago`;
  const price = formatPrice(place.priceAmount, currency);

  return (
    <div className="flex flex-col gap-2 border border-line bg-paper-raised p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2.5">
        <h3 className="text-[15px] font-bold">{place.name}</h3>
        <span
          className={`whitespace-nowrap rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${BAND_STYLES[place.band]}`}
        >
          {badgeLabel}
        </span>
      </div>

      {place.description && <p className="text-[13px] text-ink-soft">{place.description}</p>}

      <div className="flex items-center justify-between gap-2.5 pt-0.5">
        <span className="text-xs text-ink-faint">
          {categoryLabel}
          {price && <span className="ml-2 font-mono text-[11px] text-ink-soft">{price}</span>}
        </span>

        {place.band === "stale" ? (
          <button
            onClick={() => onConfirm("valid")}
            className="border border-stale px-3 py-1.5 text-xs text-stale"
            type="button"
          >
            Still valid?
          </button>
        ) : (
          <button
            onClick={onToggleAdd}
            type="button"
            className={`border px-3.5 py-1.5 text-xs font-semibold ${
              added ? "border-verified bg-verified-bg text-verified" : "border-accent text-accent"
            }`}
          >
            {added ? "Added ✓" : "Add to trip"}
          </button>
        )}
      </div>
    </div>
  );
}

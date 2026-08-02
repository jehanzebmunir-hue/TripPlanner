import { useTranslation } from "react-i18next";
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
  homeCurrency?: string;
  // undefined = not fetched/no home currency set (show nothing extra); null
  // = fetched but no real rate available for this pair (also show nothing
  // extra, never a guessed conversion) -- same "no citation, no claim"
  // discipline as priceAmount itself.
  exchangeRate?: number | null;
  onToggleAdd: () => void;
  onConfirm: (vote: "valid" | "invalid") => void;
}

// Renders nothing when priceAmount is null/undefined — an unverified price
// looks identical to today's UI, on purpose, rather than showing a
// confusing "price unknown" placeholder for what's still most of the data.
function formatPrice(amount: number | null | undefined, currency: string, freeLabel: string): string | null {
  if (amount == null) return null;
  if (amount === 0) return freeLabel;
  // A fixed locale, not the runtime's default (`undefined`) -- Intl's
  // default-locale resolution is environment-dependent (verified live: the
  // exact same code rendered "$30" on Ubuntu CI but a different string
  // locally on Windows), which would have made price formatting silently
  // inconsistent between this app's actual production environment and
  // whatever gets tested locally, not just a test-flakiness issue.
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function PlaceCard({
  place,
  added,
  categoryLabel,
  currency,
  homeCurrency,
  exchangeRate,
  onToggleAdd,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const badgeLabel =
    place.band === "stale"
      ? t("placeCard.stale", { days: place.daysSince })
      : t("placeCard.verified", { days: place.daysSince });
  const freeLabel = t("placeCard.free");
  const price = formatPrice(place.priceAmount, currency, freeLabel);
  // Only a real, positive priceAmount converts -- "Free" and unverified
  // prices have nothing to convert, and a 0 or negative rate would only
  // ever come from a broken provider response, never a real one.
  const converted =
    place.priceAmount && place.priceAmount > 0 && homeCurrency && exchangeRate
      ? formatPrice(place.priceAmount * exchangeRate, homeCurrency, freeLabel)
      : null;

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
          {converted && <span className="ml-1 font-mono text-[11px] text-ink-faint">(≈ {converted})</span>}
        </span>

        {place.band === "stale" ? (
          <button
            onClick={() => onConfirm("valid")}
            className="border border-stale px-3 py-1.5 text-xs text-stale"
            type="button"
          >
            {t("placeCard.stillValid")}
          </button>
        ) : (
          <button
            onClick={onToggleAdd}
            type="button"
            aria-pressed={added}
            className={`border px-3.5 py-2 text-xs font-semibold ${
              added ? "border-verified bg-verified-bg text-verified" : "border-accent text-accent"
            }`}
          >
            <span role="status">{added ? t("placeCard.added") : t("placeCard.addToTrip")}</span>
          </button>
        )}
      </div>
    </div>
  );
}

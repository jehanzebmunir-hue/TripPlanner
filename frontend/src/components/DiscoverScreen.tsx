import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CATEGORIES } from "../categories";
import {
  useAddItem,
  useCities,
  useCityHealth,
  useConfirmPlace,
  useExchangeRate,
  usePlaces,
  useRemoveItem,
} from "../hooks";
import { TripLeg } from "../types";
import { PlaceCard } from "./PlaceCard";
import { PlaceCardSkeleton } from "./Skeleton";

interface Props {
  city: string;
  legs?: TripLeg[];
  interests: string[];
  tripId: string;
  addedIds: Set<string>;
  homeCurrency?: string | null;
}

export function DiscoverScreen({ city, legs = [], interests, tripId, addedIds, homeCurrency }: Props) {
  const { t } = useTranslation();
  const categoryLabel = (slug: string) =>
    t(`categories.${slug}`, CATEGORIES.find((c) => c.slug === slug)?.label ?? slug);
  const [query, setQuery] = useState("");
  // Which of this trip's cities Discover is currently browsing -- defaults
  // to the trip's primary city. Adding an item while browsing a leg's city
  // tags it with that leg automatically server-side (the place's own city
  // is matched against the trip's legs -- see backend addTripItem), so
  // there's no separate "which leg" state to manage beyond this.
  const [activeCity, setActiveCity] = useState(city);
  const allCitySlugs = [city, ...legs.map((l) => l.city)];

  const { data: places, isLoading } = usePlaces(activeCity);
  const { data: health } = useCityHealth(activeCity);
  const { data: cities } = useCities();
  const addItem = useAddItem(tripId);
  const removeItem = useRemoveItem(tripId);
  const confirm = useConfirmPlace(activeCity);
  const currency = cities?.find((c) => c.slug === activeCity)?.currency ?? "USD";
  // One shared rate for every card in this list, not one fetch per place --
  // the backend already caches a real rate at most once per pair per UTC
  // day, so there's nothing to gain from asking more than once here either.
  const { data: exchangeRate } = useExchangeRate(currency, homeCurrency ?? undefined);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <p role="status" className="sr-only">
          {t("common.loading")}
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <PlaceCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const trimmedQuery = query.trim().toLowerCase();
  const filtered = (places ?? [])
    .filter((p) => interests.length === 0 || interests.includes(p.category))
    .filter(
      (p) =>
        !trimmedQuery ||
        p.name.toLowerCase().includes(trimmedQuery) ||
        p.description?.toLowerCase().includes(trimmedQuery)
    );
  const degraded = (health ?? []).filter((h) => h.degraded);

  return (
    <div className="space-y-3">
      <h2 className="sr-only">{t("app.tabs.discover")}</h2>
      {allCitySlugs.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {allCitySlugs.map((slug) => (
            <button
              key={slug}
              type="button"
              onClick={() => setActiveCity(slug)}
              className={`border px-3 py-1 text-xs font-semibold ${
                activeCity === slug ? "border-accent bg-accent text-onaccent" : "border-line bg-paper-raised text-ink-soft"
              }`}
            >
              {cities?.find((c) => c.slug === slug)?.name ?? slug}
            </button>
          ))}
        </div>
      )}

      {degraded.length > 0 && (
        <div className="border border-aging bg-aging-bg px-3 py-2 text-xs text-aging">
          {t("discover.degradedBanner", { adapters: degraded.map((h) => h.adapter).join(", ") })}
        </div>
      )}

      {(addItem.isError || removeItem.isError || confirm.isError) && (
        <p role="alert" className="border border-stale bg-stale-bg px-3 py-2 text-xs text-stale">
          {t("discover.actionError")}
        </p>
      )}

      <p className="mb-1 text-sm text-ink-soft">
        {t("discover.matchedTo", {
          categories: interests.map(categoryLabel).join(` ${t("common.and")} `) || t("discover.allCategories"),
        })}
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("discover.searchPlaceholder")}
        aria-label={t("discover.searchLabel")}
        className="w-full border border-line bg-paper-raised px-3 py-2 text-sm"
      />

      {filtered.length === 0 && (places ?? []).length > 0 && (
        <p className="text-sm text-ink-faint">{t("discover.noFilterMatches")}</p>
      )}

      {filtered.length === 0 && (places ?? []).length === 0 && (
        <p className="text-sm text-ink-faint">{t("discover.noneIngested")}</p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {filtered.map((p) => (
          <PlaceCard
            key={p.id}
            place={p}
            added={addedIds.has(p.id)}
            categoryLabel={categoryLabel(p.category)}
            currency={currency}
            homeCurrency={homeCurrency ?? undefined}
            exchangeRate={exchangeRate?.rate}
            onToggleAdd={() => (addedIds.has(p.id) ? removeItem.mutate(p.id) : addItem.mutate(p.id))}
            onConfirm={(vote) => confirm.mutate({ id: p.id, vote })}
          />
        ))}
      </div>
    </div>
  );
}

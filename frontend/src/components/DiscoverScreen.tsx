import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CATEGORIES } from "../categories";
import { haversineKm } from "../geo";
import {
  useAddItem,
  useCities,
  useCityHealth,
  useConfirmPlace,
  useExchangeRate,
  usePlaces,
  useRemoveItem,
} from "../hooks";
import { Place, TripLeg } from "../types";
import { MapView } from "./MapView";
import { PlaceCard } from "./PlaceCard";
import { PlaceCardSkeleton } from "./Skeleton";

// How long an "Undo" offer stays live after removing a place -- long enough
// to catch a misclick, short enough not to leave a stale toast around.
const UNDO_WINDOW_MS = 6000;

type SortBy = "default" | "price" | "confidence" | "distance";

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
  const [showMap, setShowMap] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>("default");
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

  // The removal itself already happened (same real removeItem mutation as
  // before) -- this only tracks the single most recent one so a real
  // "Undo" can re-add it within a short window, the same pattern as a
  // Gmail-style "Archived · Undo" toast. Removing a second place before
  // undoing the first just lets the first one's window quietly expire,
  // rather than trying to track more than one pending undo at a time.
  const [lastRemoved, setLastRemoved] = useState<{ placeId: string; name: string } | null>(null);

  useEffect(() => {
    if (!lastRemoved) return;
    const timer = setTimeout(() => setLastRemoved(null), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [lastRemoved]);

  function handleToggleAdd(place: Place) {
    if (addedIds.has(place.id)) {
      removeItem.mutate(place.id);
      setLastRemoved({ placeId: place.id, name: place.name });
    } else {
      addItem.mutate(place.id);
      if (lastRemoved?.placeId === place.id) setLastRemoved(null);
    }
  }

  function handleUndo() {
    if (!lastRemoved) return;
    addItem.mutate(lastRemoved.placeId);
    setLastRemoved(null);
  }

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

  const activeCityCenter = cities?.find((c) => c.slug === activeCity);
  // Real values only, sorted to the end rather than fabricated -- a place
  // with no verified price, no confidence-decay data, or no coordinates
  // yet is not "worst," it's "unknown," and shouldn't be conflated with a
  // real bottom-of-the-list value like $0 or 0% confidence.
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "price") {
      if (a.priceAmount == null) return b.priceAmount == null ? 0 : 1;
      if (b.priceAmount == null) return -1;
      return a.priceAmount - b.priceAmount;
    }
    if (sortBy === "confidence") return b.confidence - a.confidence;
    if (sortBy === "distance" && activeCityCenter?.lat != null && activeCityCenter?.lng != null) {
      const center = { lat: activeCityCenter.lat, lng: activeCityCenter.lng };
      const distA = a.lat != null && a.lng != null ? haversineKm(center, { lat: a.lat, lng: a.lng }) : null;
      const distB = b.lat != null && b.lng != null ? haversineKm(center, { lat: b.lat, lng: b.lng }) : null;
      if (distA == null) return distB == null ? 0 : 1;
      if (distB == null) return -1;
      return distA - distB;
    }
    return 0;
  });

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

      {lastRemoved && (
        <div role="status" className="flex items-center justify-between gap-2 border border-line bg-paper-raised px-3 py-2 text-xs">
          <span className="text-ink-soft">{t("discover.removed", { name: lastRemoved.name })}</span>
          <button type="button" onClick={handleUndo} className="shrink-0 px-1 py-1 font-semibold text-accent underline">
            {t("discover.undo")}
          </button>
        </div>
      )}

      <p className="mb-1 text-sm text-ink-soft">
        {t("discover.matchedTo", {
          categories: interests.map(categoryLabel).join(` ${t("common.and")} `) || t("discover.allCategories"),
        })}
      </p>

      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("discover.searchPlaceholder")}
          aria-label={t("discover.searchLabel")}
          className="flex-1 border border-line bg-paper-raised px-3 py-2 text-sm"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          aria-label={t("discover.sortLabel")}
          className="border border-line bg-paper-raised px-2 py-2 text-sm"
        >
          <option value="default">{t("discover.sortDefault")}</option>
          <option value="price">{t("discover.sortPrice")}</option>
          <option value="confidence">{t("discover.sortConfidence")}</option>
          <option value="distance">{t("discover.sortDistance")}</option>
        </select>
      </div>

      {filtered.length === 0 && (places ?? []).length > 0 && (
        <p className="text-sm text-ink-faint">{t("discover.noFilterMatches")}</p>
      )}

      {filtered.length === 0 && (places ?? []).length === 0 && (
        <p className="text-sm text-ink-faint">{t("discover.noneIngested")}</p>
      )}

      {filtered.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowMap((v) => !v)}
            className="mb-2 font-mono text-[11px] uppercase tracking-wide text-ink-faint underline"
          >
            {showMap ? t("map.hide") : t("map.show")}
          </button>
          {showMap && <MapView places={sorted} />}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {sorted.map((p) => (
          <PlaceCard
            key={p.id}
            place={p}
            added={addedIds.has(p.id)}
            categoryLabel={categoryLabel(p.category)}
            currency={currency}
            homeCurrency={homeCurrency ?? undefined}
            exchangeRate={exchangeRate?.rate}
            onToggleAdd={() => handleToggleAdd(p)}
            onConfirm={(vote) => confirm.mutate({ id: p.id, vote })}
          />
        ))}
      </div>
    </div>
  );
}

import { categoryLabel } from "../categories";
import {
  useAddItem,
  useCities,
  useCityHealth,
  useConfirmPlace,
  useExchangeRate,
  usePlaces,
  useRemoveItem,
} from "../hooks";
import { PlaceCard } from "./PlaceCard";

interface Props {
  city: string;
  interests: string[];
  tripId: string;
  addedIds: Set<string>;
  homeCurrency?: string | null;
}

export function DiscoverScreen({ city, interests, tripId, addedIds, homeCurrency }: Props) {
  const { data: places, isLoading } = usePlaces(city);
  const { data: health } = useCityHealth(city);
  const { data: cities } = useCities();
  const addItem = useAddItem(tripId);
  const removeItem = useRemoveItem(tripId);
  const confirm = useConfirmPlace(city);
  const currency = cities?.find((c) => c.slug === city)?.currency ?? "USD";
  // One shared rate for every card in this list, not one fetch per place --
  // the backend already caches a real rate at most once per pair per UTC
  // day, so there's nothing to gain from asking more than once here either.
  const { data: exchangeRate } = useExchangeRate(currency, homeCurrency ?? undefined);

  if (isLoading) return <p className="text-sm text-ink-soft">Loading…</p>;

  const filtered = (places ?? []).filter((p) => interests.length === 0 || interests.includes(p.category));
  const degraded = (health ?? []).filter((h) => h.degraded);

  return (
    <div className="space-y-3">
      {degraded.length > 0 && (
        <div className="border border-aging bg-aging-bg px-3 py-2 text-xs text-aging">
          Event data may be temporarily outdated — {degraded.map((h) => h.adapter).join(", ")} couldn't be reached on
          the last attempt. Everything else here is unaffected.
        </div>
      )}

      <p className="mb-1 text-sm text-ink-soft">
        Matched to {interests.map(categoryLabel).join(" and ") || "all categories"}. Every card shows when it was
        last confirmed.
      </p>

      {filtered.length === 0 && (
        <p className="text-sm text-ink-faint">Nothing ingested for these categories yet — run the ingest script.</p>
      )}

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
  );
}

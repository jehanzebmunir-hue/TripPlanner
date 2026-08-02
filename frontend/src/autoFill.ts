import { Place } from "./types";

// A real, explainable selection, not a black box: diversify across
// categories round-robin (so a starter itinerary isn't accidentally all
// museums), preferring the freshest/most-verified entry within each
// category first. No "AI recommendation" language anywhere -- this is
// exactly the same confidence data already shown on every PlaceCard,
// just used to order a selection instead of a badge.
const BAND_RANK: Record<string, number> = { verified: 0, aging: 1, stale: 2 };

export function pickStarterPlaces(places: Place[], count: number, excludeIds: Set<string> = new Set()): Place[] {
  const candidates = places.filter((p) => !excludeIds.has(p.id));

  const byCategory = new Map<string, Place[]>();
  for (const place of candidates) {
    const list = byCategory.get(place.category) ?? [];
    list.push(place);
    byCategory.set(place.category, list);
  }
  for (const list of byCategory.values()) {
    list.sort((a, b) => (BAND_RANK[a.band] ?? 3) - (BAND_RANK[b.band] ?? 3) || a.daysSince - b.daysSince);
  }

  const categories = Array.from(byCategory.keys());
  const picked: Place[] = [];
  let round = 0;
  while (picked.length < count && categories.some((c) => (byCategory.get(c)?.length ?? 0) > round) && round < 50) {
    for (const category of categories) {
      const list = byCategory.get(category)!;
      if (list[round]) picked.push(list[round]);
      if (picked.length >= count) break;
    }
    round++;
  }

  return picked;
}

// 3 real places per real day, floor of 3 (even a 1-day trip gets a genuine
// starter set, not just one card), cap of 15 (a "starter" a traveler can
// still meaningfully review and prune, not the whole database dumped in).
export function starterTargetCount(totalDays: number): number {
  return Math.min(Math.max(totalDays * 3, 3), 15);
}

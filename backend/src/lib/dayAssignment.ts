import { haversineKm } from "../services/transit";

export interface ExistingItemForAssignment {
  dayIndex: number;
  place: { lat: number | null; lng: number | null };
}

export interface PlaceForAssignment {
  lat: number | null;
  lng: number | null;
}

/**
 * Which day a newly-added place should land on -- real geographic
 * clustering among the days already tied for the fewest items, not a raw
 * random or unconstrained nearest-day pick. Two real rules, in order:
 *
 * 1. Stay balanced: only days at the current minimum item count are ever
 *    candidates, so items still spread evenly across the trip the same way
 *    the previous round-robin did -- this never lets one day fill up while
 *    others sit empty.
 * 2. Among those balanced candidates, prefer whichever day's existing
 *    items are geographically closest to the new place, so a starter
 *    itinerary doesn't scatter a museum and a park on opposite sides of
 *    the city onto the same day just because they happened to be added in
 *    that order.
 *
 * Degrades cleanly to the old plain round-robin (lowest day number first)
 * whenever there's no real geography to go on yet -- the new place has no
 * coordinates, or none of the candidate days have any items with
 * coordinates to compare against. No day is ever skipped for lacking
 * geography; it just can't win a tie-break on distance it has no data for.
 */
export function chooseDayIndex(
  existingItems: ExistingItemForAssignment[],
  newPlace: PlaceForAssignment,
  totalDays: number
): number {
  const countByDay = new Map<number, number>();
  for (let day = 1; day <= totalDays; day++) countByDay.set(day, 0);
  for (const item of existingItems) {
    if (countByDay.has(item.dayIndex)) {
      countByDay.set(item.dayIndex, (countByDay.get(item.dayIndex) ?? 0) + 1);
    }
  }

  const minCount = Math.min(...countByDay.values());
  const eligibleDays = Array.from(countByDay.entries())
    .filter(([, count]) => count === minCount)
    .map(([day]) => day)
    .sort((a, b) => a - b);

  if (newPlace.lat == null || newPlace.lng == null) return eligibleDays[0];

  let bestDay = eligibleDays[0];
  let bestDistanceKm = Infinity;
  for (const day of eligibleDays) {
    const itemsOnDay = existingItems.filter(
      (i) => i.dayIndex === day && i.place.lat != null && i.place.lng != null
    );
    if (itemsOnDay.length === 0) continue; // no geographic signal for this day -- stays only a fallback candidate

    const nearestKm = Math.min(
      ...itemsOnDay.map((i) =>
        haversineKm({ lat: newPlace.lat!, lng: newPlace.lng! }, { lat: i.place.lat!, lng: i.place.lng! })
      )
    );
    if (nearestKm < bestDistanceKm) {
      bestDistanceKm = nearestKm;
      bestDay = day;
    }
  }
  return bestDay;
}

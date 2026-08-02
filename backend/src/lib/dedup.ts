// Real problem found by checking the live database once google-places and
// overpass started running for the same (priority-tier) cities: the same
// landmark can land as two separate Place rows under different sources --
// confirmed live in Brussels ("Manneken Pis" from both, 1m apart). Not
// widespread yet (only 6 cities had both sources populated when checked),
// but it only grows as more priority cities get ingested, so worth a real
// guard rather than a "fix later" note.
const MAX_DISTANCE_KM = 0.1; // 100m -- real landmarks this close with a matching name are the same place, not neighbors

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export interface NamedPoint {
  name: string;
  lat?: number | null;
  lng?: number | null;
}

/**
 * True when two records are close enough, with similar enough names, to
 * almost certainly be the same real place rather than two nearby things.
 * Conservative on purpose (exact or substring name match required, not
 * fuzzy/edit-distance matching) -- a missed duplicate just shows an extra
 * card; a false positive silently drops a real, distinct place.
 */
export function isLikelyDuplicate(a: NamedPoint, b: NamedPoint): boolean {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return false;
  if (haversineKm(a.lat, a.lng, b.lat, b.lng) > MAX_DISTANCE_KM) return false;

  const na = normalizeName(a.name);
  const nb = normalizeName(b.name);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

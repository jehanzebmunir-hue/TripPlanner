import { CityConfig } from "../types";

export interface Collision {
  key: string;
  field: "ticketmasterMarket" | "seatgeekVenueCity";
  cities: string[]; // slugs
}

/**
 * SeatGeek's `venue.city` filter takes a bare name with no country/state
 * disambiguation available on this endpoint, and while the Ticketmaster
 * adapter does pass `countryCode`, this check catches the collision
 * regardless of what a given API can or can't disambiguate on its own — two
 * cities that resolve to the same lookup string is a data bug either way
 * (see the San Jose, Costa Rica vs. San Jose, CA case this was built for).
 * Comparison is case-insensitive since these are free-text API params.
 */
export function findMarketCollisions(cities: CityConfig[]): Collision[] {
  const collisions: Collision[] = [];

  for (const field of ["ticketmasterMarket", "seatgeekVenueCity"] as const) {
    const byKey = new Map<string, string[]>();
    for (const city of cities) {
      const raw = city[field] ?? city.name;
      const key = raw.trim().toLowerCase();
      const slugs = byKey.get(key) ?? [];
      slugs.push(city.slug);
      byKey.set(key, slugs);
    }
    for (const [key, slugs] of byKey) {
      if (slugs.length > 1) {
        collisions.push({ key, field, cities: slugs });
      }
    }
  }

  return collisions;
}

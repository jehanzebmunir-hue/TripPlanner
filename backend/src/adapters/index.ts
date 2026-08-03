import { CityConfig, SourceAdapter } from "../types";
import { seedAdapter } from "./seed";
import { nycOpenDataEventsAdapter } from "./nycOpenDataEvents";
import { chicagoParkEventsAdapter } from "./chicagoParkEvents";
import { parisEventsAdapter } from "./parisEvents";
import { bostonEventsAdapter } from "./bostonEvents";
import { ticketmasterAdapter } from "./ticketmaster";
import { seatgeekAdapter } from "./seatgeek";
import { googlePlacesAdapter } from "./googlePlaces";
import { overpassAdapter } from "./overpass";

export const ADAPTERS: Record<string, SourceAdapter> = {
  seed: seedAdapter,
  "nyc-open-data-events": nycOpenDataEventsAdapter,
  "chicago-park-events": chicagoParkEventsAdapter,
  "paris-events": parisEventsAdapter,
  "boston-events": bostonEventsAdapter,
  ticketmaster: ticketmasterAdapter,
  seatgeek: seatgeekAdapter,
  "google-places": googlePlacesAdapter,
  overpass: overpassAdapter,
};

// Every city gets these by default — each is already parameterized by city
// name/coordinates, so adding a city needs zero bespoke adapter code. A
// municipal open-data feed is an opt-in bonus (city.extraAdapters), not a
// requirement.
export const DEFAULT_ADAPTERS = ["seed", "overpass", "ticketmaster", "seatgeek"];

// google-places is deliberately *not* in DEFAULT_ADAPTERS. With overpass now
// covering "every city gets some real static data" for free and unlimited,
// google-places' real job is a quality upgrade where it matters most, not
// baseline coverage — spreading its ~161-call/day free-tier budget across the
// whole registry would dilute it for no benefit once overpass already fills
// the gap. Restricted to config/cities.ts's priorityTier set (53 verified
// major cities), so the budget concentrates on the cities most likely to
// actually be visited, instead of one thin layer over the full 159-city
// registry.
export function adaptersForCity(city: CityConfig): string[] {
  // A resolved (not curated) city has no seed data and no hand-verified
  // Ticketmaster/SeatGeek market string -- overpass is the only adapter
  // that works for literally any coordinates with zero per-city setup, so
  // it's the only one that runs. Honest degradation (no ticketed-event
  // data) rather than guessing a market match that could easily be wrong.
  if (city.resolved) return ["overpass"];

  const base = city.priorityTier != null ? [...DEFAULT_ADAPTERS, "google-places"] : DEFAULT_ADAPTERS;
  return [...base, ...(city.extraAdapters ?? [])];
}

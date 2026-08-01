import { SourceAdapter } from "../types";
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
// requirement. overpass needs no API key and has no metered budget (unlike
// google-places) — it's the free-scale complement, not a replacement:
// google-places' curated data is generally higher quality, overpass is
// what keeps sightseeing data free and unlimited past that budget ceiling.
export const DEFAULT_ADAPTERS = ["seed", "google-places", "overpass", "ticketmaster", "seatgeek"];

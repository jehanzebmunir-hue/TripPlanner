import { SourceAdapter } from "../types";
import { seedAdapter } from "./seed";
import { nycOpenDataEventsAdapter } from "./nycOpenDataEvents";
import { chicagoParkEventsAdapter } from "./chicagoParkEvents";
import { parisEventsAdapter } from "./parisEvents";
import { bostonEventsAdapter } from "./bostonEvents";
import { ticketmasterAdapter } from "./ticketmaster";
import { seatgeekAdapter } from "./seatgeek";
import { googlePlacesAdapter } from "./googlePlaces";

export const ADAPTERS: Record<string, SourceAdapter> = {
  seed: seedAdapter,
  "nyc-open-data-events": nycOpenDataEventsAdapter,
  "chicago-park-events": chicagoParkEventsAdapter,
  "paris-events": parisEventsAdapter,
  "boston-events": bostonEventsAdapter,
  ticketmaster: ticketmasterAdapter,
  seatgeek: seatgeekAdapter,
  "google-places": googlePlacesAdapter,
};

// Every city gets these by default — each is already parameterized by city
// name, so adding a city needs zero bespoke adapter code. A municipal
// open-data feed is an opt-in bonus (city.extraAdapters), not a requirement.
export const DEFAULT_ADAPTERS = ["seed", "google-places", "ticketmaster", "seatgeek"];

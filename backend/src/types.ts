export type Tier = "static" | "structured" | "volatile";

export interface CityConfig {
  slug: string;
  name: string;
  country: string;
  // Real coordinates, geocoded live against Nominatim (OSM's own geocoder)
  // rather than asserted from memory — used as the anchor point for the
  // overpass adapter's around: radius queries.
  lat: number;
  lng: number;
  ticketmasterMarket?: string;
  seatgeekVenueCity?: string;
  /**
   * Bonus, city-specific sources on top of the default generic adapters
   * (seed, google-places, ticketmaster, seatgeek) — e.g. a municipal
   * open-data events feed. Optional: most cities won't have one, and
   * that's the point — a city shouldn't need bespoke engineering to exist.
   */
  extraAdapters?: string[];
  /**
   * 1 = verified via real, corroborated international-arrivals data; 2 =
   * unambiguous major world city by general knowledge, not a precise
   * citation. Undefined = no claim either way, not "unimportant." Used to
   * pre-warm a small, deliberate set of cities at server startup (see
   * ingestion.service.ts's warmPriorityCities) so the first real visitor
   * searching a major city isn't the one paying ensureCityFresh's cold-start
   * latency — everything else is ingested purely on demand.
   */
  priorityTier?: 1 | 2;
  /**
   * True only for a city resolved on demand via Nominatim rather than
   * present in config/cities.ts (see services/cityResolution.service.ts).
   * Gates adaptersForCity down to overpass only -- no seed data exists for
   * it, and ticketmasterMarket/seatgeekVenueCity are never set for a
   * resolved city (auto-guessing one risks matching the wrong real market).
   */
  resolved?: boolean;
}

export interface NormalizedRecord {
  externalId: string;
  category: string;
  tier: Tier;
  name: string;
  description?: string;
  lat?: number;
  lng?: number;
  address?: string;
  expiryAt?: Date;
  bookingLabel?: string;
  bookingRef?: string;
  verifiedAt?: Date;
  // undefined = not verified (the honest default); 0 = confirmed free;
  // >0 = a real, sourced number. Never a guessed figure — see seed.ts and
  // README for why.
  priceAmount?: number;
}

export interface SourceAdapter {
  name: string;
  run(city: CityConfig): Promise<NormalizedRecord[]>;
}

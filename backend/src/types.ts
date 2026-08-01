export type Tier = "static" | "structured" | "volatile";

export interface CityConfig {
  slug: string;
  name: string;
  country: string;
  ticketmasterMarket?: string;
  seatgeekVenueCity?: string;
  /**
   * Bonus, city-specific sources on top of the default generic adapters
   * (seed, google-places, ticketmaster, seatgeek) — e.g. a municipal
   * open-data events feed. Optional: most cities won't have one, and
   * that's the point — a city shouldn't need bespoke engineering to exist.
   */
  extraAdapters?: string[];
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

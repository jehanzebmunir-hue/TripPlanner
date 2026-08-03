export type Tier = "static" | "structured" | "volatile";
export type Band = "verified" | "aging" | "stale";

export interface Place {
  id: string;
  city: string;
  category: string;
  tier: Tier;
  name: string;
  description?: string | null;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  source: string;
  expiryAt?: string | null;
  bookingLabel?: string | null;
  bookingRef?: string | null;
  // null/undefined = price not verified; 0 = confirmed free; >0 = a real,
  // sourced number. Never a guessed figure.
  priceAmount?: number | null;
  // A real photo resolved from the place's own linked Wikidata entry (see
  // backend lib/wikidata.ts) -- absent for most places (not every OSM
  // element links to a notable-enough Wikidata entity), never a stock
  // photo or a guess.
  photoUrl?: string | null;
  lastVerifiedAt: string;
  confidence: number;
  band: Band;
  daysSince: number;
}

export interface TripItem {
  id: string;
  placeId: string;
  place: Place;
  // null = belongs to the trip's own primary city; set = belongs to this
  // specific additional leg. Inferred server-side from the place's own
  // city, never chosen by the frontend directly.
  legId?: string | null;
  dayIndex: number;
  addedAt: string;
}

export interface TripLeg {
  id: string;
  city: string;
  destination: string;
  startDate?: string | null;
  endDate?: string | null;
  order: number;
}

export interface Trip {
  id: string;
  city: string;
  destination: string;
  startDate?: string | null;
  endDate?: string | null;
  interests: string[];
  homeCurrency?: string | null;
  legs: TripLeg[];
  items: TripItem[];
  // Bumped on every real mutation (touchTrip) -- used client-side only to
  // notice a trip changed elsewhere (another tab, another device via the
  // shared edit link) since this session first loaded it.
  updatedAt: string;
}

// Only the raw response from creating a trip includes this -- GET /trips/:id
// never does (it's the public, view-only endpoint; returning this there
// would let anyone with the plain view link read their way into edit
// access). Must be persisted client-side right away; there's no way to
// retrieve it again afterward, by design.
export interface CreatedTrip extends Trip {
  editToken: string;
}

export interface ChecklistEntry {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
}

export interface ChecklistResponse {
  fromItinerary: ChecklistEntry[];
  weeksOut: ChecklistEntry[];
  dayOf: ChecklistEntry[];
}

export interface TransitEstimate {
  mode: string;
  minutes: number;
  km: number;
}

export interface ItineraryStop {
  place: Place;
  transitFromPrevious: TransitEstimate | null;
  // legId/itemDayIndex are what PATCH .../items/:placeId actually expects
  // (leg-relative), NOT the day's own dayIndex below (a clean global
  // position, display-only). See backend trips.routes.ts.
  legId: string | null;
  itemDayIndex: number;
}

export interface ItineraryDay {
  dayIndex: number;
  date: string | null;
  stops: ItineraryStop[];
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface CitySummary {
  slug: string;
  name: string;
  country: string;
  currency: string;
  timezone: string;
  // Real city-center coordinates -- used to sort Discover's place list by
  // distance from the city center. Optional since older cached responses
  // may predate this field.
  lat?: number;
  lng?: number;
  // "curated" = config/cities.ts, hand-verified. "community" = resolved on
  // demand from real OpenStreetMap data only, via /api/cities/search.
  // Absent on older cached responses -- treat as curated.
  dataSource?: "curated" | "community";
}

export interface TripSummary {
  id: string;
  city: string;
  destination: string;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
}

export type BudgetTier = "budget" | "moderate" | "premium";

export interface VibeOption {
  slug: string;
  label: string;
}

export interface CityAdapterHealth {
  adapter: string;
  degraded: boolean;
  consecutiveFailures: number;
  lastError: string | null;
  lastSuccessAt: string | null;
}

export interface DestinationMatch {
  slug: string;
  name: string;
  country: string;
  budgetTier: BudgetTier;
  bestSeason: string;
  matchingPlaceCount: number;
  totalPlaceCount: number;
  rationale: string;
}

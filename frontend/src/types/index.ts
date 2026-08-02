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

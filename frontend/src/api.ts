import {
  AuthResponse,
  BudgetTier,
  ChecklistResponse,
  CityAdapterHealth,
  CitySummary,
  CreatedTrip,
  DestinationMatch,
  ItineraryDay,
  Place,
  Trip,
  TripSummary,
  VibeOption,
} from "./types";

// In local dev, Vite's server.proxy forwards "/api" to localhost:3001 (see
// vite.config.ts) so a relative path works. In production the frontend and
// backend are separate Render services with no shared origin/proxy, so
// VITE_API_URL (baked in at build time) must point at the real backend host.
const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";
const TOKEN_KEY = "authToken";
// A specific trip's edit permission -- independent of accounts, see
// backend trips.service.ts's assertCanEdit. Only ever set once, right after
// createTrip() returns it; there's no way to fetch it again afterward.
const EDIT_TOKEN_KEY = "editToken";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getEditToken(): string | null {
  return localStorage.getItem(EDIT_TOKEN_KEY);
}

export function setEditToken(token: string | null): void {
  if (token) localStorage.setItem(EDIT_TOKEN_KEY, token);
  else localStorage.removeItem(EDIT_TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const editToken = getEditToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(editToken ? { "X-Edit-Token": editToken } : {}),
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    throw new Error(body?.error ?? `${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface LegInput {
  city: string;
  destination: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateTripInput {
  city: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  interests: string[];
  homeCurrency?: string;
  legs?: LegInput[];
}

export interface ExchangeRateResponse {
  from: string;
  to: string;
  rate: number | null;
}

export const api = {
  register: (email: string, password: string) =>
    request<AuthResponse>(`/auth/register`, { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    request<AuthResponse>(`/auth/login`, { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<{ id: string; email: string }>(`/auth/me`),
  deleteAccount: () => request(`/auth/me`, { method: "DELETE" }),
  requestPasswordReset: (email: string) =>
    request<{ message: string }>(`/auth/reset-request`, { method: "POST", body: JSON.stringify({ email }) }),
  confirmPasswordReset: (token: string, newPassword: string) =>
    request<{ message: string }>(`/auth/reset-confirm`, {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),
  myTrips: () => request<TripSummary[]>(`/trips`),
  deleteTrip: (tripId: string) => request(`/trips/${tripId}`, { method: "DELETE" }),

  listCities: () => request<CitySummary[]>(`/cities`),
  getCityHealth: (city: string) => request<CityAdapterHealth[]>(`/city-health?city=${encodeURIComponent(city)}`),
  listVibes: () => request<VibeOption[]>(`/recommend-destination/vibes`),
  recommendDestinations: (vibeSlug?: string, budgetTier?: BudgetTier) => {
    const params = new URLSearchParams();
    if (vibeSlug) params.set("vibe", vibeSlug);
    if (budgetTier) params.set("budget", budgetTier);
    const qs = params.toString();
    return request<DestinationMatch[]>(`/recommend-destination${qs ? `?${qs}` : ""}`);
  },
  listPlaces: (city: string) => request<Place[]>(`/places?city=${encodeURIComponent(city)}`),
  getExchangeRate: (from: string, to: string) =>
    request<ExchangeRateResponse>(`/exchange-rate?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  confirmPlace: (id: string, vote: "valid" | "invalid") =>
    request<Place>(`/places/${id}/confirm`, { method: "POST", body: JSON.stringify({ vote }) }),
  createTrip: (input: CreateTripInput) =>
    request<CreatedTrip>(`/trips`, { method: "POST", body: JSON.stringify(input) }),
  getTrip: (id: string) => request<Trip>(`/trips/${id}`),
  addItem: (tripId: string, placeId: string) =>
    request(`/trips/${tripId}/items`, { method: "POST", body: JSON.stringify({ placeId }) }),
  removeItem: (tripId: string, placeId: string) =>
    request(`/trips/${tripId}/items/${placeId}`, { method: "DELETE" }),
  moveItem: (tripId: string, placeId: string, dayIndex: number) =>
    request(`/trips/${tripId}/items/${placeId}`, { method: "PATCH", body: JSON.stringify({ dayIndex }) }),
  getItinerary: (tripId: string) => request<ItineraryDay[]>(`/trips/${tripId}/itinerary`),
  getChecklist: (tripId: string) => request<ChecklistResponse>(`/trips/${tripId}/checklist`),
  toggleChecklistItem: (tripId: string, itemKey: string, checked: boolean) =>
    request(`/trips/${tripId}/checklist/${itemKey}/toggle`, {
      method: "POST",
      body: JSON.stringify({ checked }),
    }),

  async prefetchForOffline(tripId: string, city: string): Promise<void> {
    await Promise.all([
      api.getTrip(tripId),
      api.getItinerary(tripId),
      api.getChecklist(tripId),
      api.listPlaces(city),
    ]);
  },
};

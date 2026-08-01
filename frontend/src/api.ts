import {
  AuthResponse,
  BudgetTier,
  ChecklistResponse,
  CityAdapterHealth,
  CitySummary,
  DestinationMatch,
  ItineraryDay,
  Place,
  Trip,
  TripSummary,
  VibeOption,
} from "./types";

const BASE = "/api";
const TOKEN_KEY = "authToken";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export interface CreateTripInput {
  city: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  interests: string[];
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
  confirmPlace: (id: string, vote: "valid" | "invalid") =>
    request<Place>(`/places/${id}/confirm`, { method: "POST", body: JSON.stringify({ vote }) }),
  createTrip: (input: CreateTripInput) =>
    request<Trip>(`/trips`, { method: "POST", body: JSON.stringify(input) }),
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

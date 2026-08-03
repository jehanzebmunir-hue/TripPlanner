import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, UpdateTripInput } from "./api";
import { pickStarterPlaces, starterTargetCount } from "./autoFill";
import { daysBetween } from "./dateUtils";
import { BudgetTier, Trip } from "./types";

export function useCities() {
  return useQuery({ queryKey: ["cities"], queryFn: () => api.listCities(), staleTime: Infinity });
}

export function useVibes() {
  return useQuery({ queryKey: ["vibes"], queryFn: () => api.listVibes(), staleTime: Infinity });
}

export function useRecommendDestinations(vibeSlug?: string, budgetTier?: BudgetTier, enabled = true) {
  return useQuery({
    queryKey: ["recommend-destination", vibeSlug, budgetTier],
    queryFn: () => api.recommendDestinations(vibeSlug, budgetTier),
    enabled,
  });
}

export function usePlaces(city: string) {
  return useQuery({ queryKey: ["places", city], queryFn: () => api.listPlaces(city), enabled: !!city });
}

export function useExchangeRate(from?: string, to?: string) {
  return useQuery({
    queryKey: ["exchange-rate", from, to],
    queryFn: () => api.getExchangeRate(from!, to!),
    // Same currency needs no request at all, and the backend already caches
    // real pairs per UTC day -- no reason to refetch more often than that
    // client-side either.
    enabled: !!from && !!to && from !== to,
    staleTime: 60 * 60 * 1000,
  });
}

export function useCityHealth(city: string) {
  return useQuery({
    queryKey: ["city-health", city],
    queryFn: () => api.getCityHealth(city),
    enabled: !!city,
    // Health is about *right now*, not something worth serving stale from
    // cache the way places/cities are — re-check it each time this mounts.
    staleTime: 0,
  });
}

export function useTrip(tripId?: string) {
  return useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => api.getTrip(tripId!),
    enabled: !!tripId,
  });
}

export function useItinerary(tripId?: string) {
  return useQuery({
    queryKey: ["itinerary", tripId],
    queryFn: () => api.getItinerary(tripId!),
    enabled: !!tripId,
  });
}

export function useChecklist(tripId?: string) {
  return useQuery({
    queryKey: ["checklist", tripId],
    queryFn: () => api.getChecklist(tripId!),
    enabled: !!tripId,
  });
}

export function useCreateTrip() {
  return useMutation({ mutationFn: api.createTrip });
}

function useInvalidateTrip(tripId?: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["trip", tripId] });
    qc.invalidateQueries({ queryKey: ["itinerary", tripId] });
    qc.invalidateQueries({ queryKey: ["checklist", tripId] });
  };
}

/** Re-syncs trip/itinerary/checklist together after noticing a real change made elsewhere (see App.tsx's staleness banner). */
export function useRefreshTrip(tripId?: string) {
  return useInvalidateTrip(tripId);
}

export function useUpdateTrip(tripId?: string) {
  const invalidate = useInvalidateTrip(tripId);
  return useMutation({
    mutationFn: (input: UpdateTripInput) => api.updateTrip(tripId!, input),
    onSuccess: invalidate,
  });
}

export function useAddItem(tripId?: string) {
  const invalidate = useInvalidateTrip(tripId);
  return useMutation({
    mutationFn: (placeId: string) => api.addItem(tripId!, placeId),
    onSuccess: invalidate,
  });
}

export function useRemoveItem(tripId?: string) {
  const invalidate = useInvalidateTrip(tripId);
  return useMutation({
    mutationFn: (placeId: string) => api.removeItem(tripId!, placeId),
    onSuccess: invalidate,
  });
}

// Real places only, picked by the same confidence/category data already
// shown on every card -- diversified across categories, preferring
// verified over aging/stale within each. Not one API call: fetches each of
// the trip's cities' real place lists, then adds the picks one at a time
// via the exact same addItem the manual "Add to trip" button uses -- same
// permission checks, same leg inference, same day-assignment, nothing
// duplicated. Sequential, not parallel, since addTripItem's day-assignment
// reads a live count before writing; concurrent calls could race on it.
export function useAutoFillItinerary(tripId?: string) {
  const invalidate = useInvalidateTrip(tripId);
  return useMutation({
    mutationFn: async (trip: Trip) => {
      const addedIds = new Set(trip.items.map((i) => i.placeId));
      const citiesInTrip = [
        { slug: trip.city, startDate: trip.startDate, endDate: trip.endDate },
        ...trip.legs.map((l) => ({ slug: l.city, startDate: l.startDate, endDate: l.endDate })),
      ];

      for (const c of citiesInTrip) {
        const places = await api.listPlaces(c.slug);
        const target = starterTargetCount(daysBetween(c.startDate, c.endDate));
        const picked = pickStarterPlaces(places, target, addedIds);
        for (const place of picked) {
          await api.addItem(tripId!, place.id);
          addedIds.add(place.id);
        }
      }
    },
    onSuccess: invalidate,
  });
}

export function useMoveItem(tripId?: string) {
  const invalidate = useInvalidateTrip(tripId);
  return useMutation({
    mutationFn: ({ placeId, dayIndex }: { placeId: string; dayIndex: number }) =>
      api.moveItem(tripId!, placeId, dayIndex),
    onSuccess: invalidate,
  });
}

export function useToggleChecklistItem(tripId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemKey, checked }: { itemKey: string; checked: boolean }) =>
      api.toggleChecklistItem(tripId!, itemKey, checked),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist", tripId] }),
  });
}

export function useMyTrips(enabled: boolean) {
  return useQuery({ queryKey: ["myTrips"], queryFn: () => api.myTrips(), enabled });
}

export function useDeleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => api.deleteTrip(tripId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myTrips"] }),
  });
}

export function useConfirmPlace(city: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vote }: { id: string; vote: "valid" | "invalid" }) => api.confirmPlace(id, vote),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["places", city] }),
  });
}

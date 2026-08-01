import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { BudgetTier } from "./types";

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

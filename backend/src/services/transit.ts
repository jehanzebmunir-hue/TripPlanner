const MODE_SPEED_KMH: Record<string, number> = { walk: 4.5, subway: 28 };

interface Coord {
  lat?: number | null;
  lng?: number | null;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function estimateTransit(a: Coord, b: Coord): { mode: string; minutes: number; km: number } | null {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const km = haversineKm({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
  const mode = km > 1.5 ? "subway" : "walk";
  const minutes = Math.max(3, Math.round((km / MODE_SPEED_KMH[mode]) * 60));
  return { mode, minutes, km: Math.round(km * 10) / 10 };
}

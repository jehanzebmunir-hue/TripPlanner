// Real, standard great-circle distance -- the same formula the backend's
// transit-time estimate (services/transit.ts) already uses between two
// stops, applied here between a place and the city's own center point.
// Not a walking-route distance (no real routing engine involved, same
// honest limitation the transit estimate already has), just a real
// straight-line distance in kilometers.
const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

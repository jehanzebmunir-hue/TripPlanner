import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Place } from "../types";

// Leaflet's default marker icon is referenced by a relative URL baked into
// the library, which breaks once Vite bundles/hashes the actual image
// files -- rebuilding the icon from the real imported (and correctly
// hashed) asset URLs is the standard, documented fix for this, not a
// workaround specific to this app.
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Props {
  places: Place[];
  onSelect?: (placeId: string) => void;
}

type PlaceWithCoords = Place & { lat: number; lng: number };

// The standard public tile.openstreetmap.org server, same source and
// attribution this app's overpass adapter already uses for place data --
// free, no key, real per its own usage policy (reasonable traffic, a real
// identifying context, no bulk caching), which this app's actual scale
// stays well inside of. No paid tile provider, matching every other
// integration's "free-tier-first" pattern.
export function MapView({ places, onSelect }: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const withCoords = places.filter((p): p is PlaceWithCoords => p.lat != null && p.lng != null);
    const currentIds = new Set(withCoords.map((p) => p.id));

    for (const [id, marker] of markersRef.current) {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    for (const p of withCoords) {
      const existing = markersRef.current.get(p.id);
      if (existing) {
        existing.setLatLng([p.lat, p.lng]);
      } else {
        const marker = L.marker([p.lat, p.lng]).addTo(map).bindTooltip(p.name);
        if (onSelect) marker.on("click", () => onSelect(p.id));
        markersRef.current.set(p.id, marker);
      }
    }

    if (withCoords.length > 0) {
      map.fitBounds(
        L.latLngBounds(withCoords.map((p) => [p.lat, p.lng] as [number, number])),
        { padding: [24, 24], maxZoom: 15 }
      );
    }
  }, [places, onSelect]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={t("map.regionLabel", { count: places.filter((p) => p.lat != null && p.lng != null).length })}
      className="h-64 w-full border border-line"
    />
  );
}

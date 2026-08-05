// Self-hosted, aggregate-only usage tracking -- no third-party vendor, no
// PII. Fire-and-forget by design: a failed analytics call is not a real
// problem worth surfacing to a user or retrying, it just means one data
// point is missing. Never awaited by callers, never throws.
const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

// Mirrors the backend's own closed allowlist (services/analytics.service.ts)
// -- kept here as a real type, not free text, so a typo in a call site is a
// compile error instead of a silently-dropped event.
export type AnalyticsEventName =
  | "tab_view"
  | "map_toggled"
  | "sort_changed"
  | "itinerary_exported"
  | "item_undo"
  | "autofill_used"
  | "language_changed"
  | "city_search_used"
  | "itinerary_drag_move"
  | "trip_edited"
  | "booking_link_clicked";

export function trackEvent(name: AnalyticsEventName, context?: string): void {
  fetch(`${BASE}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, context }),
  }).catch(() => {
    // Deliberately swallowed -- see module comment.
  });
}

// Tags an outbound booking link with UTM params before any affiliate deal
// exists, so real referral-attribution data (on the receiving site's own
// analytics) accumulates from day one -- retrofitting this after the fact
// loses the historical data a future affiliate negotiation would want.
// Falls back to the raw url unmodified if it's not a real parseable URL
// (defensive only; every real adapter source already gives out an absolute
// URL, this just never breaks a real booking link over a malformed one).
export function tagBookingUrl(url: string, source: string): string {
  try {
    const tagged = new URL(url);
    tagged.searchParams.set("utm_source", "tripplanner");
    tagged.searchParams.set("utm_medium", "referral");
    tagged.searchParams.set("utm_content", source);
    return tagged.toString();
  } catch {
    return url;
  }
}

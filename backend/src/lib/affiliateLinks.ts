// Off by default, exactly like every other optional integration in this
// app (Google Places, the email provider, the support link): until a real
// affiliate ID is configured for a given domain, every bookingRef passes
// through completely unchanged. Keyed by the URL's own real domain, not
// by which adapter ingested it -- a single adapter (seed) links out to
// many different real domains (a museum's own site, CityPASS, OpenTable),
// and only some of those have a real affiliate program to speak of.
// Turning one on later is a config change (two env vars), not an
// engineering project: no code here needs to change to add a real ID once
// a partnership exists.
const AFFILIATE_DOMAINS: { key: string; matches: (hostname: string) => boolean }[] = [
  // Verified live against real ingested NYC data: the Ticketmaster
  // Discovery API doesn't only return ticketmaster.com links -- it
  // surfaces events across its own sibling ticketing brands too
  // (Universe, TicketWeb, both real Ticketmaster/Live Nation
  // properties). A domain matcher scoped to ticketmaster.com alone missed
  // most of a real 45-event sample from this exact adapter.
  { key: "TICKETMASTER", matches: (h) => h.endsWith("ticketmaster.com") || h.endsWith("universe.com") || h.endsWith("ticketweb.com") },
  { key: "SEATGEEK", matches: (h) => h.endsWith("seatgeek.com") },
  { key: "CITYPASS", matches: (h) => h.endsWith("citypass.com") },
  { key: "OPENTABLE", matches: (h) => h.endsWith("opentable.com") },
  { key: "VIATOR", matches: (h) => h.endsWith("viator.com") },
  { key: "GETYOURGUIDE", matches: (h) => h.endsWith("getyourguide.com") },
  { key: "BOOKING", matches: (h) => h.endsWith("booking.com") },
];

/**
 * Appends a real affiliate tracking parameter to a real booking URL, only
 * when both the parameter name and the ID are configured for that URL's
 * own domain (AFFILIATE_PARAM_<KEY> / AFFILIATE_ID_<KEY>). Returns the URL
 * completely unchanged otherwise -- including when it's null/undefined, or
 * malformed enough that `new URL()` itself rejects it, since a booking
 * link this app didn't generate should never be silently dropped just
 * because affiliate tracking couldn't be layered onto it.
 */
export function withAffiliateTracking(url: string | null | undefined): string | null | undefined {
  if (!url) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const domain = AFFILIATE_DOMAINS.find((d) => d.matches(parsed.hostname));
  if (!domain) return url;

  const param = process.env[`AFFILIATE_PARAM_${domain.key}`];
  const value = process.env[`AFFILIATE_ID_${domain.key}`];
  if (!param || !value) return url;

  parsed.searchParams.set(param, value);
  return parsed.toString();
}

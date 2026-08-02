import { find as findTimezone } from "geo-tz";
import { prisma } from "../lib/prisma";
import { geocodePlace } from "../lib/nominatim";
import { CITIES } from "../config/cities";
import { getCurrency, getTimezone } from "../config/localization";
import { CityConfig } from "../types";

export interface CitySearchResult {
  slug: string;
  name: string;
  country: string;
  currency: string;
  timezone: string;
  // "curated" = config/cities.ts, hand-verified market strings and (for
  // priority cities) google-places data. "community" = resolved on demand
  // from real OpenStreetMap data only -- honestly fewer curated details,
  // not a lesser copy of the same thing.
  dataSource: "curated" | "community";
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents (U+0300-U+036F) so accented/unaccented spellings still collide onto one slug
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function displayName(name: string, countryCode: string): string {
  try {
    const country = new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode);
    return country ? `${name}, ${country}` : name;
  } catch {
    return name;
  }
}

function registryMatches(query: string): CitySearchResult[] {
  const q = query.toLowerCase();
  return CITIES.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q)).map((c) => ({
    slug: c.slug,
    name: c.name,
    country: c.country,
    currency: getCurrency(c),
    timezone: getTimezone(c),
    dataSource: "curated" as const,
  }));
}

async function cachedMatches(query: string, exclude: Set<string>): Promise<CitySearchResult[]> {
  // Matching on aliases too, not just name, is load-bearing: Nominatim's
  // "name" is the place's local name, not necessarily what was typed to
  // find it (searching "Bruges" resolves and caches a row literally named
  // "Brugge, Belgium" -- its real Dutch name). Without the alias match, a
  // second search for the same English spelling would silently miss its
  // own cached result and either show nothing or wastefully re-geocode.
  const rows = await prisma.resolvedCity.findMany({
    where: {
      OR: [{ name: { contains: query, mode: "insensitive" } }, { aliases: { has: query.toLowerCase() } }],
    },
    take: 8,
  });
  return rows
    .filter((r) => !exclude.has(r.slug))
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      country: r.country,
      currency: r.currency,
      timezone: r.timezone,
      dataSource: "community" as const,
    }));
}

/**
 * Registry first, then previously-resolved cities, and only falls through
 * to a live Nominatim call when those two don't already turn up enough --
 * so a repeat search for the same real place never re-geocodes it. Every
 * genuinely new match is cached permanently before being returned, keyed by
 * a slug stable enough to also become that city's Place/Trip/TripLeg key.
 */
export async function searchCities(query: string): Promise<CitySearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const registry = registryMatches(trimmed);
  const known = new Set(registry.map((r) => r.slug));
  const cached = await cachedMatches(trimmed, known);
  cached.forEach((c) => known.add(c.slug));

  // A live Nominatim call only fires when the curated registry and cache
  // together found nothing at all -- an existing curated/cached match is
  // already a real, known place, so there's no reason to spend an extra
  // ~1s network round-trip padding the list further.
  const combined = [...registry, ...cached];
  if (combined.length > 0) return combined;

  const live = await geocodePlace(trimmed);
  const fresh: CitySearchResult[] = [];
  for (const place of live) {
    // region disambiguates real, distinct places that share a name and
    // country (Springfield, IL vs. Springfield, MO) -- without it they'd
    // silently collide onto the same cached row.
    const slug = slugify([place.name, place.region, place.countryCode].filter(Boolean).join("-"));
    if (known.has(slug)) continue;
    known.add(slug);

    const timezone = findTimezone(place.lat, place.lng)[0] ?? "UTC";
    const currency = getCurrency({ country: place.countryCode });
    const name = displayName(place.name, place.countryCode);

    const alias = trimmed.toLowerCase();
    const row = await prisma.resolvedCity.upsert({
      where: { slug },
      create: { slug, name, country: place.countryCode, lat: place.lat, lng: place.lng, timezone, currency, aliases: [alias] },
      // Reached only if this exact slug already existed under a different
      // query than found it here (the cache lookup above already covers
      // "same query, same row") -- append the new alias so both queries
      // resolve it next time, rather than losing the earlier one.
      update: { aliases: { push: alias } },
    });
    fresh.push({
      slug: row.slug,
      name: row.name,
      country: row.country,
      currency: row.currency,
      timezone: row.timezone,
      dataSource: "community",
    });
  }

  return [...combined, ...fresh];
}

/** getCity()'s fallback for a slug not in the curated registry. */
export async function resolveCity(slug: string): Promise<CityConfig | undefined> {
  const row = await prisma.resolvedCity.findUnique({ where: { slug } });
  if (!row) return undefined;
  return { slug: row.slug, name: row.name, country: row.country, lat: row.lat, lng: row.lng, resolved: true };
}

/** GET /api/cities -- the curated registry plus every city resolved so far. */
export async function listAllCities(): Promise<CitySearchResult[]> {
  const registry = CITIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    country: c.country,
    currency: getCurrency(c),
    timezone: getTimezone(c),
    dataSource: "curated" as const,
  }));
  const resolved = await prisma.resolvedCity.findMany();
  return [
    ...registry,
    ...resolved.map((r) => ({
      slug: r.slug,
      name: r.name,
      country: r.country,
      currency: r.currency,
      timezone: r.timezone,
      dataSource: "community" as const,
    })),
  ];
}

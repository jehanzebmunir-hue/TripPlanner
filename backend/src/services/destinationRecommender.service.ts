import { prisma } from "../lib/prisma";
import { CITIES } from "../config/cities";
import { BudgetTier, getTravelProfile } from "../config/travelProfile";

export interface VibeOption {
  slug: string;
  label: string;
  category: string;
}

// One vibe per real ingested category — deliberately not a richer taxonomy,
// so every option is guaranteed to correspond to something that actually
// exists in the data. See README "Two ways into the app": no fabricated
// destination-comparison metrics, only signals derived from real ingested
// places.
export const VIBE_OPTIONS: VibeOption[] = [
  { slug: "culture", label: "History & Culture", category: "sightseeing-culture" },
  { slug: "adventure", label: "Outdoor & Adventure", category: "outdoor-nature" },
  { slug: "nightlife", label: "Nightlife & Entertainment", category: "arts-entertainment-nightlife" },
  { slug: "food", label: "Food-Focused", category: "food-dining" },
  { slug: "relaxation", label: "Relaxation & Wellness", category: "wellness-relaxation" },
];

export interface DestinationMatch {
  slug: string;
  name: string;
  country: string;
  budgetTier: BudgetTier;
  bestSeason: string;
  matchingPlaceCount: number;
  totalPlaceCount: number;
  rationale: string;
}

export interface RecommendParams {
  vibeSlug?: string;
  budgetTier?: BudgetTier;
}

/**
 * Ranks cities by how much of their real ingested place data matches a
 * requested vibe, optionally filtered by curated budget tier. A city with
 * nothing ingested yet contributes no signal and is left out entirely,
 * rather than shown with a made-up score — same discipline as everywhere
 * else in this app: no data, no claim.
 */
export async function recommendDestinations(params: RecommendParams): Promise<DestinationMatch[]> {
  const vibe = VIBE_OPTIONS.find((v) => v.slug === params.vibeSlug);

  const grouped = await prisma.place.groupBy({
    by: ["city", "category"],
    _count: { _all: true },
  });

  const totalsByCity = new Map<string, number>();
  const matchByCity = new Map<string, number>();
  for (const row of grouped) {
    totalsByCity.set(row.city, (totalsByCity.get(row.city) ?? 0) + row._count._all);
    if (vibe && row.category === vibe.category) {
      matchByCity.set(row.city, (matchByCity.get(row.city) ?? 0) + row._count._all);
    }
  }

  const results: DestinationMatch[] = [];
  for (const city of CITIES) {
    const total = totalsByCity.get(city.slug) ?? 0;
    if (total === 0) continue;

    const profile = getTravelProfile(city.slug);
    if (params.budgetTier && profile.budgetTier !== params.budgetTier) continue;

    const matching = vibe ? matchByCity.get(city.slug) ?? 0 : total;
    if (vibe && matching === 0) continue;

    results.push({
      slug: city.slug,
      name: city.name,
      country: city.country,
      budgetTier: profile.budgetTier,
      bestSeason: profile.bestSeason,
      matchingPlaceCount: matching,
      totalPlaceCount: total,
      rationale: vibe
        ? `${matching} of ${total} ingested places are tagged "${vibe.label}"`
        : `${total} places ingested`,
    });
  }

  results.sort((a, b) => {
    const ratioA = a.matchingPlaceCount / a.totalPlaceCount;
    const ratioB = b.matchingPlaceCount / b.totalPlaceCount;
    return ratioB - ratioA || b.matchingPlaceCount - a.matchingPlaceCount;
  });

  return results.slice(0, 12);
}

import { prisma } from "../lib/prisma";
import { computeConfidence } from "../lib/decay";
import { withAffiliateTracking } from "../lib/affiliateLinks";
import { ensureCityFresh } from "./ingestion.service";

// A real, non-fabricated "well-attested" signal -- this app deliberately has
// no invented popularity score anywhere (see README), so this surfaces real
// Confirmation rows (an actual visitor clicking "Still valid?") instead of
// inventing one. 30 days: long enough to accumulate a real signal at this
// app's actual traffic level, short enough that "recent" still means
// something -- a vote from a year ago isn't a current trust signal.
const RECENT_CONFIRMATION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

async function recentConfirmationCounts(placeIds: string[]): Promise<Map<string, number>> {
  if (placeIds.length === 0) return new Map();
  const rows = await prisma.confirmation.findMany({
    where: {
      placeId: { in: placeIds },
      vote: "valid",
      createdAt: { gte: new Date(Date.now() - RECENT_CONFIRMATION_WINDOW_MS) },
    },
    select: { placeId: true },
  });
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.placeId, (counts.get(row.placeId) ?? 0) + 1);
  }
  return counts;
}

export async function listPlaces(city: string, opts: { category?: string; tier?: string } = {}) {
  await ensureCityFresh(city);

  const rows = await prisma.place.findMany({
    where: {
      city,
      ...(opts.category ? { category: opts.category } : {}),
      ...(opts.tier ? { tier: opts.tier } : {}),
    },
    orderBy: { name: "asc" },
  });

  const confirmationCounts = await recentConfirmationCounts(rows.map((p) => p.id));

  return rows.map((p) => {
    const { confidence, band, daysSince } = computeConfidence(p.tier, p.lastVerifiedAt);
    return {
      ...p,
      bookingRef: withAffiliateTracking(p.bookingRef),
      confidence,
      band,
      daysSince,
      recentConfirmations: confirmationCounts.get(p.id) ?? 0,
    };
  });
}

export async function confirmPlace(placeId: string, vote: "valid" | "invalid") {
  await prisma.confirmation.create({ data: { placeId, vote } });

  const now = new Date();
  const lastVerifiedAt = vote === "valid" ? now : new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const place = await prisma.place.update({ where: { id: placeId }, data: { lastVerifiedAt } });
  const { confidence, band, daysSince } = computeConfidence(place.tier, place.lastVerifiedAt);
  const confirmationCounts = await recentConfirmationCounts([placeId]);
  return {
    ...place,
    bookingRef: withAffiliateTracking(place.bookingRef),
    confidence,
    band,
    daysSince,
    recentConfirmations: confirmationCounts.get(placeId) ?? 0,
  };
}

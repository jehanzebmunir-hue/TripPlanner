import { prisma } from "../lib/prisma";
import { computeConfidence } from "../lib/decay";
import { withAffiliateTracking } from "../lib/affiliateLinks";
import { ensureCityFresh } from "./ingestion.service";

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

  return rows.map((p) => {
    const { confidence, band, daysSince } = computeConfidence(p.tier, p.lastVerifiedAt);
    return { ...p, bookingRef: withAffiliateTracking(p.bookingRef), confidence, band, daysSince };
  });
}

export async function confirmPlace(placeId: string, vote: "valid" | "invalid") {
  await prisma.confirmation.create({ data: { placeId, vote } });

  const now = new Date();
  const lastVerifiedAt = vote === "valid" ? now : new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const place = await prisma.place.update({ where: { id: placeId }, data: { lastVerifiedAt } });
  const { confidence, band, daysSince } = computeConfidence(place.tier, place.lastVerifiedAt);
  return { ...place, bookingRef: withAffiliateTracking(place.bookingRef), confidence, band, daysSince };
}

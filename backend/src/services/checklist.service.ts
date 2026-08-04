import { prisma } from "../lib/prisma";
import { getWeatherSummary } from "../lib/weather";
import { deriveWeatherPackingTypes, PackingType } from "../lib/packingSuggestions";
import { findAnyCity } from "./cityResolution.service";
import { assertCanEdit, Requester, touchTrip } from "./trips.service";

export interface PackingSection {
  // null when there's no real weather data to show at all -- no dates set on
  // the trip yet, or the destination/live lookup didn't resolve. Distinct
  // from "forecast"/"historical-average" so the frontend can render nothing
  // rather than a confusing empty section, same pattern as .ics export's
  // "needs real dates" gate.
  source: "forecast" | "historical-average" | null;
  avgHighC: number | null;
  avgLowC: number | null;
  rainChancePercent: number | null;
  items: { id: string; type: PackingType; checked: boolean }[];
}

const EMPTY_PACKING_SECTION: PackingSection = {
  source: null,
  avgHighC: null,
  avgLowC: null,
  rainChancePercent: null,
  items: [],
};

async function getPackingSection(
  citySlug: string,
  startDate: Date | null,
  endDate: Date | null,
  checkedKeys: Set<string>
): Promise<PackingSection> {
  if (!startDate || !endDate) return EMPTY_PACKING_SECTION;

  const city = await findAnyCity(citySlug);
  if (!city) return EMPTY_PACKING_SECTION;

  const summary = await getWeatherSummary(city, startDate, endDate);
  if (!summary) return EMPTY_PACKING_SECTION;

  const types = deriveWeatherPackingTypes(summary);
  return {
    source: summary.source,
    avgHighC: summary.avgHighC,
    avgLowC: summary.avgLowC,
    rainChancePercent: summary.rainChancePercent,
    items: types.map((type) => {
      const id = `weather-${type}`;
      return { id, type, checked: checkedKeys.has(id) };
    }),
  };
}

export async function getChecklist(tripId: string) {
  const trip = await prisma.trip.findUniqueOrThrow({
    where: { id: tripId },
    include: { items: { include: { place: true } } },
  });

  const checks = await prisma.checklistCheck.findMany({ where: { tripId } });
  const checkedKeys = new Set(checks.filter((c) => c.checked).map((c) => c.itemKey));

  const fromItinerary = trip.items
    .filter((i) => i.place.bookingRef)
    .map((i) => {
      const itemKey = `booking-${i.place.id}`;
      return {
        id: itemKey,
        label: `${i.place.bookingLabel ?? "Book"}: ${i.place.name}`,
        hint: i.place.expiryAt ? `By ${i.place.expiryAt.toDateString()}` : undefined,
        checked: checkedKeys.has(itemKey),
      };
    });

  const templates = await prisma.checklistTemplateItem.findMany({
    orderBy: [{ phase: "asc" }, { order: "asc" }],
  });

  const toEntry = (t: (typeof templates)[number]) => ({
    id: t.id,
    label: t.label,
    checked: checkedKeys.has(t.id),
  });

  const packing = await getPackingSection(trip.city, trip.startDate, trip.endDate, checkedKeys);

  return {
    fromItinerary,
    weeksOut: templates.filter((t) => t.phase === "weeks_out").map(toEntry),
    dayOf: templates.filter((t) => t.phase === "day_of").map(toEntry),
    packing,
  };
}

// Previously the one write endpoint in this app with no permission check at
// all -- every other trip mutation requires the real edit-token or account
// ownership; this used to skip that entirely, so anyone who knew or guessed
// a tripId could toggle its checklist items with no edit link needed. Same
// assertCanEdit check every other mutation uses, now enforced here too.
export async function toggleChecklistItem(tripId: string, itemKey: string, checked: boolean, requester: Requester = {}) {
  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId }, select: { userId: true, editToken: true } });
  assertCanEdit(trip, requester);

  const check = await prisma.checklistCheck.upsert({
    where: { tripId_itemKey: { tripId, itemKey } },
    create: { tripId, itemKey, checked },
    update: { checked },
  });
  await touchTrip(tripId);
  return check;
}

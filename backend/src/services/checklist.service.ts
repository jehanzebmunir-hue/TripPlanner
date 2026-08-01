import { prisma } from "../lib/prisma";
import { touchTrip } from "./trips.service";

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

  return {
    fromItinerary,
    weeksOut: templates.filter((t) => t.phase === "weeks_out").map(toEntry),
    dayOf: templates.filter((t) => t.phase === "day_of").map(toEntry),
  };
}

export async function toggleChecklistItem(tripId: string, itemKey: string, checked: boolean) {
  const check = await prisma.checklistCheck.upsert({
    where: { tripId_itemKey: { tripId, itemKey } },
    create: { tripId, itemKey, checked },
    update: { checked },
  });
  await touchTrip(tripId);
  return check;
}

import { prisma } from "../lib/prisma";

class ForbiddenError extends Error {
  status = 403;
}

class BadRequestError extends Error {
  status = 400;
}

// Thrown by updateTrip's real optimistic-concurrency check -- two people
// editing the same trip's dates/currency near-simultaneously previously hit
// silent last-write-wins with no warning at all.
class ConflictError extends Error {
  status = 409;
}

interface LegInput {
  city: string;
  destination: string;
  startDate?: string;
  endDate?: string;
}

interface CreateTripInput {
  city: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  interests?: string[];
  userId?: string;
  homeCurrency?: string;
  legs?: LegInput[];
}

// Whoever can mutate a trip: the account owner (via JWT), if it has one, or
// whoever holds the real edit-token link -- independent of accounts, so an
// anonymous trip's creator (or anyone they share the edit link with) can
// still edit it. The plain /trip/:id view link never grants this on its
// own; see getTrip, which deliberately never returns editToken.
interface Requester {
  userId?: string;
  editToken?: string;
}

function assertCanEdit(trip: { userId: string | null; editToken: string }, requester: Requester): void {
  const isOwner = !!trip.userId && trip.userId === requester.userId;
  const hasEditToken = !!requester.editToken && requester.editToken === trip.editToken;
  if (!isOwner && !hasEditToken) {
    throw new ForbiddenError("You don't have permission to edit this trip");
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

function tripLengthDays(startDate: Date | null, endDate: Date | null): number {
  if (!startDate || !endDate) return 1;
  const days = Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS) + 1;
  return Math.max(1, days);
}

export async function createTrip(input: CreateTripInput) {
  return prisma.trip.create({
    data: {
      city: input.city,
      destination: input.destination,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      interests: JSON.stringify(input.interests ?? []),
      userId: input.userId,
      homeCurrency: input.homeCurrency || null,
      legs: input.legs?.length
        ? {
            create: input.legs.map((leg, i) => ({
              city: leg.city,
              destination: leg.destination,
              startDate: leg.startDate ? new Date(leg.startDate) : undefined,
              endDate: leg.endDate ? new Date(leg.endDate) : undefined,
              order: i,
            })),
          }
        : undefined,
    },
    include: { legs: true },
  });
  // editToken is included here (create() returns the full row) -- this is
  // the ONE time it's meant to leave the server. The frontend must persist
  // it at creation; there is no way to retrieve it again afterward, by
  // design (see getTrip).
}

export async function getUserTrips(userId: string) {
  return prisma.trip.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, city: true, destination: true, startDate: true, endDate: true, createdAt: true },
  });
}

export async function getTrip(id: string) {
  const trip = await prisma.trip.findUniqueOrThrow({
    where: { id },
    include: {
      items: { include: { place: true }, orderBy: { addedAt: "asc" } },
      legs: { orderBy: { order: "asc" } },
    },
  });
  // editToken deliberately excluded -- this is the public, view-only
  // endpoint (no auth required). Returning it here would let anyone with
  // the plain view link read their way into edit access, defeating the
  // entire point of separating the two.
  const { editToken: _editToken, ...rest } = trip;
  return { ...rest, interests: JSON.parse(trip.interests) as string[] };
}

// Bumps Trip.updatedAt. TripItem/ChecklistCheck rows don't touch their
// parent Trip row on their own, so without this, a trip someone is
// actively planning would look just as "abandoned" by updatedAt as one
// truly forgotten the day it was created — the retention sweep
// (services/retention.service.ts) relies on this being real. Note this has
// to set updatedAt explicitly: Prisma silently downgrades an empty
// `data: {}` update into a plain SELECT with no UPDATE statement at all,
// so `@updatedAt`'s auto-bump never fires on a no-op write — caught by
// smoke-testing this against the real database, not something a mocked
// unit test would ever have revealed.
export async function touchTrip(tripId: string): Promise<void> {
  await prisma.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } });
}

export async function addTripItem(tripId: string, placeId: string, requester: Requester = {}) {
  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId }, include: { legs: true } });
  assertCanEdit(trip, requester);

  const place = await prisma.place.findUniqueOrThrow({ where: { id: placeId } });
  // Which leg this item belongs to is inferred from the place's own city,
  // not passed in by the caller -- Place already carries city, so there's
  // no need for the frontend to track "which leg am I browsing" as
  // separate state just to tag new items correctly.
  const matchingLeg = trip.legs.find((l) => l.city === place.city);
  const legId = matchingLeg?.id ?? null;

  const existingCount = await prisma.tripItem.count({ where: { tripId, legId } });
  const relevantStart = matchingLeg?.startDate ?? trip.startDate;
  const relevantEnd = matchingLeg?.endDate ?? trip.endDate;
  const totalDays = tripLengthDays(relevantStart, relevantEnd);
  const dayIndex = (existingCount % totalDays) + 1;

  const item = await prisma.tripItem.upsert({
    where: { tripId_placeId: { tripId, placeId } },
    create: { tripId, placeId, legId, dayIndex },
    update: {},
  });
  await touchTrip(tripId);
  return item;
}

export async function removeTripItem(tripId: string, placeId: string, requester: Requester = {}) {
  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
  assertCanEdit(trip, requester);

  await prisma.tripItem
    .delete({ where: { tripId_placeId: { tripId, placeId } } })
    .catch(() => undefined);
  await touchTrip(tripId).catch(() => undefined);
}

export async function moveTripItem(tripId: string, placeId: string, dayIndex: number, requester: Requester = {}) {
  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId }, include: { legs: true } });
  assertCanEdit(trip, requester);

  // dayIndex here is leg-relative -- the same thing it's stored as, and the
  // same thing addTripItem computes it as. It is NOT the global sequential
  // number the itinerary GET endpoint shows (see buildItinerary) -- moving
  // an item across cities isn't supported through this (remove it and add
  // it again while browsing the other city instead), only reordering
  // within its own city's date range. Validated here, not just trusted,
  // since silently storing an out-of-range value would compute a wrong
  // real-world date the next time the itinerary is fetched.
  const existingItem = await prisma.tripItem.findUniqueOrThrow({ where: { tripId_placeId: { tripId, placeId } } });
  const leg = existingItem.legId ? trip.legs.find((l) => l.id === existingItem.legId) : undefined;
  const relevantStart = leg?.startDate ?? trip.startDate;
  const relevantEnd = leg?.endDate ?? trip.endDate;
  const totalDays = tripLengthDays(relevantStart, relevantEnd);
  if (dayIndex < 1 || dayIndex > totalDays) {
    throw new BadRequestError(`Day ${dayIndex} is outside this item's own city's date range (1-${totalDays})`);
  }

  const item = await prisma.tripItem.update({
    where: { tripId_placeId: { tripId, placeId } },
    data: { dayIndex },
  });
  await touchTrip(tripId);
  return item;
}

interface UpdateLegInput {
  id: string;
  startDate?: string | null;
  endDate?: string | null;
}

interface UpdateTripInput {
  startDate?: string | null;
  endDate?: string | null;
  homeCurrency?: string | null;
  legs?: UpdateLegInput[];
  // The trip's updatedAt the client last saw, from GET /trips/:id -- when
  // provided and it no longer matches the trip's real current value,
  // someone else changed this trip since the client's copy was fetched.
  // Omitted entirely: no check, same as before this field existed.
  expectedUpdatedAt?: string;
}

// Deliberately narrow: dates and home currency only, on the trip and on
// existing legs. Reassigning a primary city or a leg's city is explicitly
// out of scope here -- every already-added TripItem is tied to a specific
// city, and changing the city out from under them is a real data-integrity
// question (do the items move with it? get orphaned? silently vanish?)
// that a same-city date fix doesn't need to answer. Adding/removing legs
// stays a creation-time-only operation for the same reason.
export async function updateTrip(tripId: string, input: UpdateTripInput, requester: Requester = {}) {
  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId }, include: { legs: true, items: true } });
  assertCanEdit(trip, requester);

  if (input.expectedUpdatedAt !== undefined && input.expectedUpdatedAt !== trip.updatedAt.toISOString()) {
    throw new ConflictError("This trip was changed elsewhere — refresh and try again before saving.");
  }

  const parseDate = (v: string | null | undefined) => (v ? new Date(v) : null);

  if (input.startDate !== undefined || input.endDate !== undefined) {
    const newStart = input.startDate !== undefined ? parseDate(input.startDate) : trip.startDate;
    const newEnd = input.endDate !== undefined ? parseDate(input.endDate) : trip.endDate;
    const totalDays = tripLengthDays(newStart, newEnd);
    const outOfRange = trip.items.filter((i) => i.legId === null && i.dayIndex > totalDays).length;
    if (outOfRange > 0) {
      throw new BadRequestError(
        `${outOfRange} item(s) would fall outside the new date range — move or remove them first`
      );
    }
  }

  const legUpdates = input.legs ?? [];
  for (const legUpdate of legUpdates) {
    const leg = trip.legs.find((l) => l.id === legUpdate.id);
    if (!leg) throw new BadRequestError(`Unknown leg: ${legUpdate.id}`);
    const newStart = legUpdate.startDate !== undefined ? parseDate(legUpdate.startDate) : leg.startDate;
    const newEnd = legUpdate.endDate !== undefined ? parseDate(legUpdate.endDate) : leg.endDate;
    const totalDays = tripLengthDays(newStart, newEnd);
    const outOfRange = trip.items.filter((i) => i.legId === leg.id && i.dayIndex > totalDays).length;
    if (outOfRange > 0) {
      throw new BadRequestError(
        `${outOfRange} item(s) in ${leg.destination} would fall outside the new date range — move or remove them first`
      );
    }
  }

  await prisma.trip.update({
    where: { id: tripId },
    data: {
      startDate: input.startDate !== undefined ? parseDate(input.startDate) : undefined,
      endDate: input.endDate !== undefined ? parseDate(input.endDate) : undefined,
      homeCurrency: input.homeCurrency !== undefined ? input.homeCurrency || null : undefined,
    },
  });

  for (const legUpdate of legUpdates) {
    await prisma.tripLeg.update({
      where: { id: legUpdate.id },
      data: {
        startDate: legUpdate.startDate !== undefined ? parseDate(legUpdate.startDate) : undefined,
        endDate: legUpdate.endDate !== undefined ? parseDate(legUpdate.endDate) : undefined,
      },
    });
  }

  await touchTrip(tripId);
  return getTrip(tripId);
}

export async function deleteTrip(tripId: string, requester: Requester = {}) {
  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
  assertCanEdit(trip, requester);
  await prisma.checklistCheck.deleteMany({ where: { tripId } });
  await prisma.trip.delete({ where: { id: tripId } });
}

interface ItineraryLeg {
  id: string;
  startDate: Date | null;
}

interface ItineraryItem<TPlace> {
  legId: string | null;
  dayIndex: number;
  place: TPlace;
}

interface ItineraryTrip<TPlace> {
  startDate: Date | null;
  legs: ItineraryLeg[];
  items: ItineraryItem<TPlace>[];
}

/**
 * Groups a trip's items into real calendar days. Each item's date comes
 * from its OWN leg's date range (or the trip's primary range if it has no
 * leg) — not one flat offset from the trip's own startDate, which would be
 * wrong the moment a trip has more than one city with its own dates.
 * Grouped by that real date, not by the raw per-leg dayIndex stored on each
 * item, since two different legs both have a "dayIndex 1" that are
 * genuinely different calendar days. Undated trips (no startDate anywhere)
 * fall back to grouping by (legId, dayIndex) directly.
 */
export function buildItinerary<TPlace>(trip: ItineraryTrip<TPlace>) {
  const withDate = trip.items.map((item) => {
    const leg = item.legId ? trip.legs.find((l) => l.id === item.legId) : undefined;
    const relevantStart = leg?.startDate ?? trip.startDate;
    const date = relevantStart ? new Date(relevantStart.getTime() + (item.dayIndex - 1) * DAY_MS) : null;
    return { item, date };
  });

  const groupKey = (entry: (typeof withDate)[number]) =>
    entry.date ? entry.date.toISOString().slice(0, 10) : `${entry.item.legId ?? "primary"}:${entry.item.dayIndex}`;

  const groups = new Map<string, { date: Date | null; items: ItineraryItem<TPlace>[] }>();
  for (const entry of withDate) {
    const key = groupKey(entry);
    const existing = groups.get(key);
    if (existing) existing.items.push(entry.item);
    else groups.set(key, { date: entry.date, items: [entry.item] });
  }

  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    if (a.date && b.date) return a.date.getTime() - b.date.getTime();
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });

  return sortedGroups.map((group, i) => ({
    dayIndex: i + 1, // a clean, sequential, global position -- not any item's own leg-relative dayIndex
    date: group.date,
    items: group.items,
  }));
}

import { prisma } from "../lib/prisma";

class ForbiddenError extends Error {
  status = 403;
}

interface CreateTripInput {
  city: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  interests?: string[];
  userId?: string;
  homeCurrency?: string;
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
    },
  });
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
    include: { items: { include: { place: true }, orderBy: { addedAt: "asc" } } },
  });
  return { ...trip, interests: JSON.parse(trip.interests) as string[] };
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

export async function addTripItem(tripId: string, placeId: string) {
  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
  const existingCount = await prisma.tripItem.count({ where: { tripId } });
  const totalDays = tripLengthDays(trip.startDate, trip.endDate);
  const dayIndex = (existingCount % totalDays) + 1;

  const item = await prisma.tripItem.upsert({
    where: { tripId_placeId: { tripId, placeId } },
    create: { tripId, placeId, dayIndex },
    update: {},
  });
  await touchTrip(tripId);
  return item;
}

export async function removeTripItem(tripId: string, placeId: string) {
  await prisma.tripItem
    .delete({ where: { tripId_placeId: { tripId, placeId } } })
    .catch(() => undefined);
  await touchTrip(tripId).catch(() => undefined);
}

export async function moveTripItem(tripId: string, placeId: string, dayIndex: number) {
  const item = await prisma.tripItem.update({
    where: { tripId_placeId: { tripId, placeId } },
    data: { dayIndex },
  });
  await touchTrip(tripId);
  return item;
}

export async function deleteTrip(tripId: string, userId?: string) {
  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
  if (trip.userId && trip.userId !== userId) {
    throw new ForbiddenError("You don't have permission to delete this trip");
  }
  await prisma.checklistCheck.deleteMany({ where: { tripId } });
  await prisma.trip.delete({ where: { id: tripId } });
}

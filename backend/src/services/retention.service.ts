import { prisma } from "../lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_STALE_TRIP_DAYS = 90;

/**
 * Deletes anonymous trips (no account attached) that haven't been touched
 * — created, or had an item/checklist entry added, moved, or toggled, all
 * of which bump Trip.updatedAt via touchTrip — in over `maxAgeDays`. Trips
 * attached to an account are never swept here; an account is itself a
 * signal the trip was worth keeping.
 *
 * This exists because anonymous trips have no owner to ever explicitly
 * delete them — without a sweep, every abandoned click-around session
 * becomes a permanent row. Ready to run on a schedule once there's a real
 * deployment target with a job scheduler; for now it's a script
 * (`npm run sweep:stale-trips`), the same "real logic, no fake infra"
 * pattern as everything else in this project that needs production hosting
 * to become fully real.
 */
export async function sweepStaleAnonymousTrips(maxAgeDays: number = DEFAULT_STALE_TRIP_DAYS): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeDays * DAY_MS);
  const stale = await prisma.trip.findMany({
    where: { userId: null, updatedAt: { lt: cutoff } },
    select: { id: true },
  });
  if (stale.length === 0) return 0;

  const tripIds = stale.map((t) => t.id);
  await prisma.checklistCheck.deleteMany({ where: { tripId: { in: tripIds } } });
  await prisma.trip.deleteMany({ where: { id: { in: tripIds } } });
  return stale.length;
}

/**
 * Password-reset tokens are single-use and expire in an hour, but nothing
 * ever deleted the row afterward — a used or expired token has no further
 * purpose but was left to accumulate indefinitely. This has no bearing on
 * whether a token is *accepted* (confirmPasswordReset already checks
 * expiry and usedAt itself); it's purely table hygiene, safe to run on any
 * cadence.
 */
export async function sweepExpiredPasswordResetTokens(): Promise<number> {
  const { count } = await prisma.passwordResetToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] },
  });
  return count;
}

import { prisma } from "./prisma";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
}

/**
 * Checked *before* a metered API call, not logged after — the point is to
 * stop spend from happening, not to report on it once it already has.
 * Returns false (and does not count) once `maxCallsPerDay` is reached for
 * that adapter today.
 *
 * Increments first, via a single atomic upsert, then checks the guaranteed
 * post-increment value -- a separate findUnique-then-upsert (the original
 * shape here) reads and writes in two round-trips, so two concurrent calls
 * near the limit could both read the same under-budget count and both
 * proceed, overshooting by one. Incrementing unconditionally and
 * compensating with a decrement when it turns out to be over budget closes
 * that gap: the increment itself can't race with itself.
 */
export async function withinDailyBudget(adapter: string, maxCallsPerDay: number): Promise<boolean> {
  const date = todayKey();
  const { callCount } = await prisma.apiCallBudget.upsert({
    where: { adapter_date: { adapter, date } },
    create: { adapter, date, callCount: 1 },
    update: { callCount: { increment: 1 } },
  });

  if (callCount > maxCallsPerDay) {
    await prisma.apiCallBudget.update({
      where: { adapter_date: { adapter, date } },
      data: { callCount: { decrement: 1 } },
    });
    return false;
  }
  return true;
}

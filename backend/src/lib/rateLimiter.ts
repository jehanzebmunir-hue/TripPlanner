import { prisma } from "./prisma";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
}

/**
 * Checked *before* a metered API call, not logged after — the point is to
 * stop spend from happening, not to report on it once it already has.
 * Returns false (and does not count) once `maxCallsPerDay` is reached for
 * that adapter today; every allowed call increments the persisted counter
 * first, so two concurrent calls near the limit can't both slip through on
 * a stale read.
 */
export async function withinDailyBudget(adapter: string, maxCallsPerDay: number): Promise<boolean> {
  const date = todayKey();
  const existing = await prisma.apiCallBudget.findUnique({ where: { adapter_date: { adapter, date } } });
  if ((existing?.callCount ?? 0) >= maxCallsPerDay) return false;

  await prisma.apiCallBudget.upsert({
    where: { adapter_date: { adapter, date } },
    create: { adapter, date, callCount: 1 },
    update: { callCount: { increment: 1 } },
  });
  return true;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Mirrors the backend's tripLengthDays (trips.service.ts) exactly -- used
// wherever the frontend needs to know how many real days a trip or leg
// spans, to stay consistent with what the backend will actually accept.
export function daysBetween(startDate: string | null | undefined, endDate: string | null | undefined): number {
  if (!startDate || !endDate) return 1;
  const days = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / DAY_MS) + 1;
  return Math.max(1, days);
}

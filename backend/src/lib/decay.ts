const DECAY_WINDOW_DAYS: Record<string, number> = {
  static: 90,
  structured: 30,
  volatile: 14,
};

const DAY_MS = 24 * 60 * 60 * 1000;

export type ConfidenceBand = "verified" | "aging" | "stale";

export function computeConfidence(
  tier: string,
  lastVerifiedAt: Date,
  now: Date = new Date()
): { confidence: number; band: ConfidenceBand; daysSince: number } {
  const windowDays = DECAY_WINDOW_DAYS[tier] ?? DECAY_WINDOW_DAYS.structured;
  const daysSince = (now.getTime() - lastVerifiedAt.getTime()) / DAY_MS;
  const confidence = Math.max(0, Math.min(100, Math.round(100 - (daysSince / windowDays) * 100)));
  const band: ConfidenceBand = confidence >= 66 ? "verified" : confidence >= 33 ? "aging" : "stale";
  return { confidence, band, daysSince: Math.max(0, Math.floor(daysSince)) };
}

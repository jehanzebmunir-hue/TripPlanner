export type PackingType = "rain" | "warm-layer" | "sun-protection";

// Deterministic, documented thresholds -- not a model, not a guess. Each
// check is independent, so a hot, rainy destination can trigger both
// sun-protection and rain in the same trip.
const RAIN_CHANCE_THRESHOLD_PERCENT = 30; // Open-Meteo's own daily precip probability, or historical wet-day frequency
const WARM_LAYER_LOW_THRESHOLD_C = 10;
const SUN_PROTECTION_HIGH_THRESHOLD_C = 27;

/** Real, sourced weather numbers in, a stable set of packing categories out. */
export function deriveWeatherPackingTypes(summary: {
  avgHighC: number;
  avgLowC: number;
  rainChancePercent: number;
}): PackingType[] {
  const types: PackingType[] = [];
  if (summary.rainChancePercent >= RAIN_CHANCE_THRESHOLD_PERCENT) types.push("rain");
  if (summary.avgLowC <= WARM_LAYER_LOW_THRESHOLD_C) types.push("warm-layer");
  if (summary.avgHighC >= SUN_PROTECTION_HIGH_THRESHOLD_C) types.push("sun-protection");
  return types;
}

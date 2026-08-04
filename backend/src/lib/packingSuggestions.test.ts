import { describe, expect, it } from "vitest";
import { deriveWeatherPackingTypes } from "./packingSuggestions";

describe("deriveWeatherPackingTypes", () => {
  it("suggests nothing for mild, dry weather", () => {
    expect(deriveWeatherPackingTypes({ avgHighC: 20, avgLowC: 14, rainChancePercent: 10 })).toEqual([]);
  });

  it("suggests rain gear once rain chance crosses the real threshold", () => {
    expect(deriveWeatherPackingTypes({ avgHighC: 20, avgLowC: 14, rainChancePercent: 29 })).toEqual([]);
    expect(deriveWeatherPackingTypes({ avgHighC: 20, avgLowC: 14, rainChancePercent: 30 })).toEqual(["rain"]);
  });

  it("suggests a warm layer once the average low drops to or below the threshold", () => {
    expect(deriveWeatherPackingTypes({ avgHighC: 15, avgLowC: 11, rainChancePercent: 0 })).toEqual([]);
    expect(deriveWeatherPackingTypes({ avgHighC: 15, avgLowC: 10, rainChancePercent: 0 })).toEqual(["warm-layer"]);
  });

  it("suggests sun protection once the average high reaches the threshold", () => {
    expect(deriveWeatherPackingTypes({ avgHighC: 26, avgLowC: 18, rainChancePercent: 0 })).toEqual([]);
    expect(deriveWeatherPackingTypes({ avgHighC: 27, avgLowC: 18, rainChancePercent: 0 })).toEqual(["sun-protection"]);
  });

  it("combines independently-triggered types for a hot, rainy destination", () => {
    expect(deriveWeatherPackingTypes({ avgHighC: 32, avgLowC: 24, rainChancePercent: 55 })).toEqual([
      "rain",
      "sun-protection",
    ]);
  });

  it("real order is always rain, warm-layer, sun-protection when all three trigger", () => {
    expect(deriveWeatherPackingTypes({ avgHighC: 30, avgLowC: 5, rainChancePercent: 80 })).toEqual([
      "rain",
      "warm-layer",
      "sun-protection",
    ]);
  });
});

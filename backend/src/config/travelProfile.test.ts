import { describe, expect, it } from "vitest";
import { CITIES } from "./cities";
import { TRAVEL_PROFILE_BY_SLUG } from "./travelProfile";

describe("travel profile coverage", () => {
  it("has an explicit curated entry for every city in the registry", () => {
    const missing = CITIES.filter((c) => !TRAVEL_PROFILE_BY_SLUG[c.slug]).map((c) => c.slug);
    expect(missing, `cities missing a travel profile: ${missing.join(", ")}`).toEqual([]);
  });

  it("has no stray entries for slugs that no longer exist in the registry", () => {
    const citySlugs = new Set(CITIES.map((c) => c.slug));
    const stray = Object.keys(TRAVEL_PROFILE_BY_SLUG).filter((slug) => !citySlugs.has(slug));
    expect(stray, `stray travel profile entries: ${stray.join(", ")}`).toEqual([]);
  });
});

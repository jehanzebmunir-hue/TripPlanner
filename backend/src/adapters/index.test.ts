import { describe, expect, it } from "vitest";
import { CityConfig } from "../types";
import { adaptersForCity, DEFAULT_ADAPTERS } from "./index";

function city(overrides: Partial<CityConfig> = {}): CityConfig {
  return { slug: "x", name: "X", country: "US", lat: 0, lng: 0, ...overrides };
}

describe("adaptersForCity", () => {
  it("excludes google-places for a city with no priorityTier", () => {
    const adapters = adaptersForCity(city());

    expect(adapters).not.toContain("google-places");
    DEFAULT_ADAPTERS.forEach((a) => expect(adapters).toContain(a));
  });

  it("includes google-places for a priorityTier city, on top of the defaults", () => {
    const adapters = adaptersForCity(city({ priorityTier: 1 }));

    expect(adapters).toContain("google-places");
    DEFAULT_ADAPTERS.forEach((a) => expect(adapters).toContain(a));
  });

  it("still appends extraAdapters regardless of priorityTier", () => {
    const adapters = adaptersForCity(city({ extraAdapters: ["boston-events"] }));

    expect(adapters).toContain("boston-events");
    expect(adapters).not.toContain("google-places");
  });

  it("treats priorityTier 2 the same as priorityTier 1", () => {
    expect(adaptersForCity(city({ priorityTier: 2 }))).toContain("google-places");
  });
});

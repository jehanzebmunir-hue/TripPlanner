import { describe, expect, it } from "vitest";
import { CityConfig } from "../types";
import { findMarketCollisions } from "./collisions";

function city(overrides: Partial<CityConfig> & Pick<CityConfig, "slug" | "name" | "country">): CityConfig {
  return { lat: 0, lng: 0, ...overrides };
}

describe("findMarketCollisions", () => {
  it("finds no collisions across the real, current city registry", async () => {
    const { CITIES } = await import("../config/cities");
    expect(findMarketCollisions(CITIES)).toEqual([]);
  });

  it("flags two cities that resolve to the same ticketmasterMarket string", () => {
    const cities = [
      city({ slug: "san-jose-cr", name: "San José, Costa Rica", country: "CR", ticketmasterMarket: "San Jose" }),
      city({ slug: "san-jose-ca", name: "San Jose, CA", country: "US", ticketmasterMarket: "San Jose" }),
    ];
    const collisions = findMarketCollisions(cities);
    expect(collisions).toHaveLength(1);
    expect(collisions[0].field).toBe("ticketmasterMarket");
    expect(collisions[0].cities.sort()).toEqual(["san-jose-ca", "san-jose-cr"]);
  });

  it("is case-insensitive", () => {
    const cities = [
      city({ slug: "a", name: "A", country: "US", seatgeekVenueCity: "Valencia" }),
      city({ slug: "b", name: "B", country: "ES", seatgeekVenueCity: "valencia" }),
    ];
    expect(findMarketCollisions(cities)).toHaveLength(1);
  });

  it("falls back to city name when no explicit market string is set", () => {
    const cities = [
      city({ slug: "a", name: "Springfield", country: "US" }),
      city({ slug: "b", name: "Springfield", country: "AU" }),
    ];
    const collisions = findMarketCollisions(cities);
    expect(collisions.length).toBeGreaterThan(0);
  });

  it("does not flag distinct market strings", () => {
    const cities = [
      city({ slug: "a", name: "A", country: "US", ticketmasterMarket: "New York" }),
      city({ slug: "b", name: "B", country: "US", ticketmasterMarket: "Los Angeles" }),
    ];
    expect(findMarketCollisions(cities)).toEqual([]);
  });
});

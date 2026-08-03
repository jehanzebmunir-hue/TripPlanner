import { describe, expect, it } from "vitest";
import { haversineKm } from "./geo";

describe("haversineKm", () => {
  it("is 0 for the same point", () => {
    expect(haversineKm({ lat: 40.7128, lng: -74.006 }, { lat: 40.7128, lng: -74.006 })).toBe(0);
  });

  it("matches the real, known distance between NYC and LA within 1km", () => {
    const km = haversineKm({ lat: 40.7128, lng: -74.006 }, { lat: 34.0522, lng: -118.2437 });
    expect(km).toBeGreaterThan(3935);
    expect(km).toBeLessThan(3937);
  });
});

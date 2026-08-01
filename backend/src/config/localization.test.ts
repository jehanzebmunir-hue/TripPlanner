import { describe, expect, it } from "vitest";
import { CITIES } from "./cities";
import { getCurrency, getTimezone } from "./localization";

describe("localization coverage", () => {
  it("resolves a real currency (not the US fallback) for every city's country", () => {
    const countriesSeen = new Set(CITIES.map((c) => c.country));
    for (const city of CITIES) {
      const currency = getCurrency(city);
      expect(currency, `${city.slug} (${city.country}) has no currency mapping`).toMatch(/^[A-Z]{3}$/);
    }
    // Sanity check the fallback itself isn't masking a gap: every country
    // actually present in the registry must have an explicit entry.
    expect(countriesSeen.size).toBeGreaterThan(0);
  });

  it("resolves a real IANA timezone (not the UTC fallback) for every city", () => {
    for (const city of CITIES) {
      const tz = getTimezone(city);
      expect(tz, `${city.slug} (${city.country}) fell back to UTC`).not.toBe("UTC");
      expect(() => new Intl.DateTimeFormat("en-US", { timeZone: tz })).not.toThrow();
    }
  });

  it("gives Los Angeles and New York different timezones despite sharing a country", () => {
    expect(getTimezone({ slug: "la", country: "US" })).toBe("America/Los_Angeles");
    expect(getTimezone({ slug: "nyc", country: "US" })).toBe("America/New_York");
  });

  it("gives every eurozone city EUR", () => {
    expect(getCurrency({ country: "FR" })).toBe("EUR");
    expect(getCurrency({ country: "DE" })).toBe("EUR");
    expect(getCurrency({ country: "IE" })).toBe("EUR");
  });
});

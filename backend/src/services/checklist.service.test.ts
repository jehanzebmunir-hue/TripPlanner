import { beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueOrThrow = vi.fn();
const checkFindMany = vi.fn();
const templateFindMany = vi.fn();
const checkUpsert = vi.fn();

vi.mock("../lib/prisma", () => ({
  prisma: {
    trip: { findUniqueOrThrow: (...a: unknown[]) => findUniqueOrThrow(...a) },
    checklistCheck: {
      findMany: (...a: unknown[]) => checkFindMany(...a),
      upsert: (...a: unknown[]) => checkUpsert(...a),
    },
    checklistTemplateItem: { findMany: (...a: unknown[]) => templateFindMany(...a) },
  },
}));

const touchTrip = vi.fn().mockResolvedValue(undefined);
vi.mock("./trips.service", () => ({ touchTrip: (...a: unknown[]) => touchTrip(...a) }));

const findAnyCity = vi.fn();
vi.mock("./cityResolution.service", () => ({ findAnyCity: (...a: unknown[]) => findAnyCity(...a) }));

const getWeatherSummary = vi.fn();
vi.mock("../lib/weather", () => ({ getWeatherSummary: (...a: unknown[]) => getWeatherSummary(...a) }));

const CITY = { slug: "paris", name: "Paris, France", country: "FR", lat: 48.8566, lng: 2.3522 };

function trip(overrides: Partial<{ city: string; startDate: Date | null; endDate: Date | null; items: unknown[] }> = {}) {
  return {
    id: "trip1",
    city: "paris",
    startDate: new Date("2026-08-05"),
    endDate: new Date("2026-08-10"),
    items: [],
    ...overrides,
  };
}

describe("getChecklist", () => {
  beforeEach(() => {
    findUniqueOrThrow.mockReset();
    checkFindMany.mockReset().mockResolvedValue([]);
    templateFindMany.mockReset().mockResolvedValue([]);
    findAnyCity.mockReset().mockResolvedValue(CITY);
    getWeatherSummary.mockReset().mockResolvedValue(null);
  });

  it("builds booking items from itinerary places that have a real bookingRef, keyed by place id", async () => {
    findUniqueOrThrow.mockResolvedValue(
      trip({
        items: [
          { place: { id: "p1", name: "The Louvre", bookingRef: "https://example.com", bookingLabel: "Buy", expiryAt: null } },
          { place: { id: "p2", name: "A free park", bookingRef: null } },
        ],
      })
    );
    const { getChecklist } = await import("./checklist.service");

    const result = await getChecklist("trip1");

    expect(result.fromItinerary).toEqual([
      { id: "booking-p1", label: "Buy: The Louvre", hint: undefined, checked: false },
    ]);
  });

  it("marks a checklist entry checked when a real ChecklistCheck row says so", async () => {
    findUniqueOrThrow.mockResolvedValue(trip());
    checkFindMany.mockResolvedValue([{ tripId: "trip1", itemKey: "tmpl-1", checked: true }]);
    templateFindMany.mockResolvedValue([{ id: "tmpl-1", phase: "weeks_out", label: "Check passport validity", order: 0 }]);
    const { getChecklist } = await import("./checklist.service");

    const result = await getChecklist("trip1");

    expect(result.weeksOut).toEqual([{ id: "tmpl-1", label: "Check passport validity", checked: true }]);
  });

  describe("packing section", () => {
    it("returns an empty, source: null section when the trip has no real dates set", async () => {
      findUniqueOrThrow.mockResolvedValue(trip({ startDate: null, endDate: null }));
      const { getChecklist } = await import("./checklist.service");

      const result = await getChecklist("trip1");

      expect(result.packing).toEqual({ source: null, avgHighC: null, avgLowC: null, rainChancePercent: null, items: [] });
      expect(findAnyCity).not.toHaveBeenCalled();
      expect(getWeatherSummary).not.toHaveBeenCalled();
    });

    it("returns an empty section when the trip's city can't be resolved at all", async () => {
      findUniqueOrThrow.mockResolvedValue(trip());
      findAnyCity.mockResolvedValue(undefined);
      const { getChecklist } = await import("./checklist.service");

      const result = await getChecklist("trip1");

      expect(result.packing.items).toEqual([]);
      expect(getWeatherSummary).not.toHaveBeenCalled();
    });

    it("returns an empty section when no real weather data is available", async () => {
      findUniqueOrThrow.mockResolvedValue(trip());
      getWeatherSummary.mockResolvedValue(null);
      const { getChecklist } = await import("./checklist.service");

      const result = await getChecklist("trip1");

      expect(result.packing).toEqual({ source: null, avgHighC: null, avgLowC: null, rainChancePercent: null, items: [] });
    });

    it("derives real packing items from a real weather summary, and reports which are already checked", async () => {
      findUniqueOrThrow.mockResolvedValue(trip());
      checkFindMany.mockResolvedValue([{ tripId: "trip1", itemKey: "weather-rain", checked: true }]);
      getWeatherSummary.mockResolvedValue({ source: "forecast", avgHighC: 30, avgLowC: 22, rainChancePercent: 60 });
      const { getChecklist } = await import("./checklist.service");

      const result = await getChecklist("trip1");

      expect(result.packing.source).toBe("forecast");
      expect(result.packing.avgHighC).toBe(30);
      expect(result.packing.items).toEqual([
        { id: "weather-rain", type: "rain", checked: true },
        { id: "weather-sun-protection", type: "sun-protection", checked: false },
      ]);
      expect(getWeatherSummary).toHaveBeenCalledWith(CITY, trip().startDate, trip().endDate);
    });
  });
});

describe("toggleChecklistItem", () => {
  beforeEach(() => {
    checkUpsert.mockReset().mockResolvedValue({ tripId: "trip1", itemKey: "weather-rain", checked: true });
    touchTrip.mockClear();
  });

  it("upserts the check and touches the trip so retention/staleness tracking sees the real activity", async () => {
    const { toggleChecklistItem } = await import("./checklist.service");

    await toggleChecklistItem("trip1", "weather-rain", true);

    expect(checkUpsert).toHaveBeenCalledWith({
      where: { tripId_itemKey: { tripId: "trip1", itemKey: "weather-rain" } },
      create: { tripId: "trip1", itemKey: "weather-rain", checked: true },
      update: { checked: true },
    });
    expect(touchTrip).toHaveBeenCalledWith("trip1");
  });
});

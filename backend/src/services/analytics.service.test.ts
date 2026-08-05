import { beforeEach, describe, expect, it, vi } from "vitest";

const analyticsEventCreate = vi.fn();
const analyticsEventGroupBy = vi.fn();

vi.mock("../lib/prisma", () => ({
  prisma: {
    analyticsEvent: {
      create: (...a: unknown[]) => analyticsEventCreate(...a),
      groupBy: (...a: unknown[]) => analyticsEventGroupBy(...a),
    },
  },
}));

describe("recordEvent", () => {
  beforeEach(() => {
    analyticsEventCreate.mockReset().mockResolvedValue(undefined);
  });

  it("records a known event", async () => {
    const { recordEvent } = await import("./analytics.service");

    await recordEvent("map_toggled", "nyc");

    expect(analyticsEventCreate).toHaveBeenCalledWith({ data: { name: "map_toggled", context: "nyc" } });
  });

  it("records a booking_link_clicked event, keyed to the place's own source adapter as context", async () => {
    const { recordEvent } = await import("./analytics.service");

    await recordEvent("booking_link_clicked", "ticketmaster");

    expect(analyticsEventCreate).toHaveBeenCalledWith({ data: { name: "booking_link_clicked", context: "ticketmaster" } });
  });

  it("rejects an unknown event name rather than logging arbitrary free text", async () => {
    const { recordEvent } = await import("./analytics.service");

    await expect(recordEvent("something_made_up")).rejects.toMatchObject({ status: 400 });
    expect(analyticsEventCreate).not.toHaveBeenCalled();
  });

  it("truncates an overlong context rather than storing unbounded text", async () => {
    const { recordEvent } = await import("./analytics.service");
    const longContext = "x".repeat(500);

    await recordEvent("city_search_used", longContext);

    const call = analyticsEventCreate.mock.calls[0][0];
    expect(call.data.context.length).toBe(100);
  });

  it("records with no context at all", async () => {
    const { recordEvent } = await import("./analytics.service");

    await recordEvent("autofill_used");

    expect(analyticsEventCreate).toHaveBeenCalledWith({ data: { name: "autofill_used", context: undefined } });
  });
});

describe("summarizeEvents", () => {
  beforeEach(() => {
    analyticsEventGroupBy.mockReset();
  });

  it("returns a real, honest zero for a known event that never fired, not an absence", async () => {
    analyticsEventGroupBy.mockResolvedValue([{ name: "map_toggled", _count: { name: 5 } }]);
    const { summarizeEvents } = await import("./analytics.service");

    const rows = await summarizeEvents(30);

    expect(rows.find((r) => r.name === "map_toggled")?.count).toBe(5);
    expect(rows.find((r) => r.name === "trip_edited")?.count).toBe(0);
  });

  it("sorts by count descending, most-used event first", async () => {
    analyticsEventGroupBy.mockResolvedValue([
      { name: "map_toggled", _count: { name: 2 } },
      { name: "sort_changed", _count: { name: 9 } },
    ]);
    const { summarizeEvents } = await import("./analytics.service");

    const rows = await summarizeEvents(30);

    expect(rows[0]).toEqual({ name: "sort_changed", count: 9 });
  });
});

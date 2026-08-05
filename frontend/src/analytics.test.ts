import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tagBookingUrl, trackEvent } from "./analytics";

describe("trackEvent", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the event name and context to the real events endpoint", () => {
    trackEvent("map_toggled", "discover");

    expect(fetch).toHaveBeenCalledWith(
      "/api/events",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "map_toggled", context: "discover" }),
      })
    );
  });

  it("posts with no context when none is given", () => {
    trackEvent("autofill_used");

    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(call[1].body)).toEqual({ name: "autofill_used", context: undefined });
  });

  it("never throws, even when the request fails -- a missing data point is not a real error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    expect(() => trackEvent("item_undo")).not.toThrow();
    // Let the swallowed rejection's microtask resolve before the test ends.
    await new Promise((r) => setTimeout(r, 0));
  });
});

describe("tagBookingUrl", () => {
  it("appends real UTM attribution params to a real booking url", () => {
    const tagged = tagBookingUrl("https://www.ticketmaster.com/event/123", "ticketmaster");

    const url = new URL(tagged);
    expect(url.searchParams.get("utm_source")).toBe("tripplanner");
    expect(url.searchParams.get("utm_medium")).toBe("referral");
    expect(url.searchParams.get("utm_content")).toBe("ticketmaster");
  });

  it("preserves the url's own existing query params rather than dropping them", () => {
    const tagged = tagBookingUrl("https://opendata.paris.fr/events?id=42", "paris-events");

    const url = new URL(tagged);
    expect(url.searchParams.get("id")).toBe("42");
    expect(url.searchParams.get("utm_source")).toBe("tripplanner");
  });

  it("falls back to the raw url unmodified rather than throwing on a malformed one", () => {
    expect(tagBookingUrl("not a real url", "seed")).toBe("not a real url");
  });
});

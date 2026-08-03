import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "./analytics";

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

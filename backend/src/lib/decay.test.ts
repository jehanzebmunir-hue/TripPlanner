import { describe, expect, it } from "vitest";
import { computeConfidence } from "./decay";

describe("computeConfidence", () => {
  it("returns full confidence for something verified right now", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const { confidence, band, daysSince } = computeConfidence("volatile", now, now);
    expect(confidence).toBe(100);
    expect(band).toBe("verified");
    expect(daysSince).toBe(0);
  });

  it("decays to zero once a record is past its window", () => {
    const verifiedAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-06-01T00:00:00Z"); // far past any window
    const { confidence, band } = computeConfidence("volatile", verifiedAt, now);
    expect(confidence).toBe(0);
    expect(band).toBe("stale");
  });

  it("applies the right window per tier — volatile decays faster than static", () => {
    const verifiedAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-08T00:00:00Z"); // 7 days later

    const volatile = computeConfidence("volatile", verifiedAt, now); // 14-day window
    const staticTier = computeConfidence("static", verifiedAt, now); // 90-day window

    expect(volatile.confidence).toBeLessThan(staticTier.confidence);
  });

  it("bands at the documented thresholds — verified >= 66, aging >= 33, else stale", () => {
    // structured tier: 30-day window. 10 days in -> confidence 67 (verified).
    const verified = computeConfidence("structured", new Date("2026-01-01T00:00:00Z"), new Date("2026-01-11T00:00:00Z"));
    expect(verified.band).toBe("verified");

    // 20 days in -> confidence 33 (aging boundary).
    const aging = computeConfidence("structured", new Date("2026-01-01T00:00:00Z"), new Date("2026-01-21T00:00:00Z"));
    expect(aging.band).toBe("aging");

    // 25 days in -> confidence 17 (stale).
    const stale = computeConfidence("structured", new Date("2026-01-01T00:00:00Z"), new Date("2026-01-26T00:00:00Z"));
    expect(stale.band).toBe("stale");
  });

  it("falls back to the structured window for an unrecognized tier", () => {
    const verifiedAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-11T00:00:00Z");
    const unknown = computeConfidence("nonsense-tier", verifiedAt, now);
    const structured = computeConfidence("structured", verifiedAt, now);
    expect(unknown.confidence).toBe(structured.confidence);
  });

  it("never returns a negative confidence for something verified in the future", () => {
    const verifiedAt = new Date("2026-06-01T00:00:00Z");
    const now = new Date("2026-01-01T00:00:00Z"); // clock skew / bad data
    const { confidence } = computeConfidence("volatile", verifiedAt, now);
    expect(confidence).toBe(100);
  });
});

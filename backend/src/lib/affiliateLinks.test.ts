import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withAffiliateTracking } from "./affiliateLinks";

const ENV_KEYS = [
  "AFFILIATE_PARAM_TICKETMASTER",
  "AFFILIATE_ID_TICKETMASTER",
  "AFFILIATE_PARAM_SEATGEEK",
  "AFFILIATE_ID_SEATGEEK",
];

describe("withAffiliateTracking", () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });
  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it("returns null/undefined unchanged", () => {
    expect(withAffiliateTracking(null)).toBeNull();
    expect(withAffiliateTracking(undefined)).toBeUndefined();
  });

  it("returns the URL completely unchanged when no affiliate ID is configured for that domain -- the honest default", () => {
    const url = "https://www.ticketmaster.com/event/12345";
    expect(withAffiliateTracking(url)).toBe(url);
  });

  it("returns a real, malformed-URL-tolerant pass-through rather than throwing", () => {
    expect(withAffiliateTracking("not a real url")).toBe("not a real url");
  });

  it("appends the real configured tracking parameter once both env vars are set for that domain", () => {
    process.env.AFFILIATE_PARAM_TICKETMASTER = "camp";
    process.env.AFFILIATE_ID_TICKETMASTER = "real-partner-id";

    const result = withAffiliateTracking("https://www.ticketmaster.com/event/12345");

    expect(result).toBe("https://www.ticketmaster.com/event/12345?camp=real-partner-id");
  });

  it("never touches a URL for a domain with no known affiliate integration at all", () => {
    process.env.AFFILIATE_PARAM_TICKETMASTER = "camp";
    process.env.AFFILIATE_ID_TICKETMASTER = "real-partner-id";

    const url = "https://www.moma.org/visit/";
    expect(withAffiliateTracking(url)).toBe(url);
  });

  it("only appends tracking for a domain that has both its own param name and ID set, not another domain's", () => {
    process.env.AFFILIATE_PARAM_TICKETMASTER = "camp";
    process.env.AFFILIATE_ID_TICKETMASTER = "real-partner-id";
    // SeatGeek's own vars deliberately left unset.

    const url = "https://seatgeek.com/event/67890";
    expect(withAffiliateTracking(url)).toBe(url);
  });

  it("treats Ticketmaster's own sibling ticketing brands (Universe, TicketWeb) as the same affiliate, not just ticketmaster.com -- verified live against real ingested data", () => {
    process.env.AFFILIATE_PARAM_TICKETMASTER = "camp";
    process.env.AFFILIATE_ID_TICKETMASTER = "real-partner-id";

    expect(withAffiliateTracking("https://www.universe.com/events/some-show-ABC123?ref=ticketmaster")).toBe(
      "https://www.universe.com/events/some-show-ABC123?ref=ticketmaster&camp=real-partner-id"
    );
    expect(withAffiliateTracking("https://www.ticketweb.com/event/some-show/12345")).toBe(
      "https://www.ticketweb.com/event/some-show/12345?camp=real-partner-id"
    );
  });

  it("preserves existing query parameters on the real URL", () => {
    process.env.AFFILIATE_PARAM_SEATGEEK = "aid";
    process.env.AFFILIATE_ID_SEATGEEK = "sg-partner-1";

    const result = withAffiliateTracking("https://seatgeek.com/event/67890?ref=search");

    expect(result).toBe("https://seatgeek.com/event/67890?ref=search&aid=sg-partner-1");
  });
});

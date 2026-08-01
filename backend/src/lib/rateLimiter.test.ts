import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const upsert = vi.fn().mockResolvedValue(undefined);

vi.mock("./prisma", () => ({
  prisma: {
    apiCallBudget: {
      findUnique: (...a: unknown[]) => findUnique(...a),
      upsert: (...a: unknown[]) => upsert(...a),
    },
  },
}));

describe("withinDailyBudget", () => {
  beforeEach(() => {
    findUnique.mockReset();
    upsert.mockClear();
  });

  it("allows the call and records it when no budget row exists yet today", async () => {
    findUnique.mockResolvedValue(null);
    const { withinDailyBudget } = await import("./rateLimiter");

    const allowed = await withinDailyBudget("google-places", 10);

    expect(allowed).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(1);
    const call = upsert.mock.calls[0][0];
    expect(call.where.adapter_date.adapter).toBe("google-places");
    expect(call.create.callCount).toBe(1);
    expect(call.update.callCount).toEqual({ increment: 1 });
  });

  it("allows the call when under budget, and increments the existing count", async () => {
    findUnique.mockResolvedValue({ adapter: "google-places", date: "2026-08-01", callCount: 5 });
    const { withinDailyBudget } = await import("./rateLimiter");

    const allowed = await withinDailyBudget("google-places", 10);

    expect(allowed).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("refuses the call once the daily budget is reached, without incrementing further", async () => {
    findUnique.mockResolvedValue({ adapter: "google-places", date: "2026-08-01", callCount: 10 });
    const { withinDailyBudget } = await import("./rateLimiter");

    const allowed = await withinDailyBudget("google-places", 10);

    expect(allowed).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("refuses the call when the count has already exceeded the budget", async () => {
    findUnique.mockResolvedValue({ adapter: "google-places", date: "2026-08-01", callCount: 15 });
    const { withinDailyBudget } = await import("./rateLimiter");

    expect(await withinDailyBudget("google-places", 10)).toBe(false);
  });

  it("tracks budgets independently per adapter", async () => {
    findUnique.mockResolvedValue(null);
    const { withinDailyBudget } = await import("./rateLimiter");

    await withinDailyBudget("google-places", 5);
    await withinDailyBudget("some-other-adapter", 5);

    expect(findUnique.mock.calls[0][0].where.adapter_date.adapter).toBe("google-places");
    expect(findUnique.mock.calls[1][0].where.adapter_date.adapter).toBe("some-other-adapter");
  });
});

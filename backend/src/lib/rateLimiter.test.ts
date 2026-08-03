import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn();
const update = vi.fn().mockResolvedValue(undefined);

vi.mock("./prisma", () => ({
  prisma: {
    apiCallBudget: {
      upsert: (...a: unknown[]) => upsert(...a),
      update: (...a: unknown[]) => update(...a),
    },
  },
}));

describe("withinDailyBudget", () => {
  beforeEach(() => {
    upsert.mockReset();
    update.mockClear();
  });

  it("allows the call and records it when no budget row exists yet today", async () => {
    upsert.mockResolvedValue({ callCount: 1 });
    const { withinDailyBudget } = await import("./rateLimiter");

    const allowed = await withinDailyBudget("google-places", 10);

    expect(allowed).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(1);
    const call = upsert.mock.calls[0][0];
    expect(call.where.adapter_date.adapter).toBe("google-places");
    expect(call.create.callCount).toBe(1);
    expect(call.update.callCount).toEqual({ increment: 1 });
    expect(update).not.toHaveBeenCalled();
  });

  it("allows the call when the post-increment count is still under budget", async () => {
    upsert.mockResolvedValue({ callCount: 6 });
    const { withinDailyBudget } = await import("./rateLimiter");

    const allowed = await withinDailyBudget("google-places", 10);

    expect(allowed).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it("allows the call when the post-increment count exactly equals the budget", async () => {
    upsert.mockResolvedValue({ callCount: 10 });
    const { withinDailyBudget } = await import("./rateLimiter");

    expect(await withinDailyBudget("google-places", 10)).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses the call once the increment pushes the count over budget, and compensates with a decrement", async () => {
    upsert.mockResolvedValue({ callCount: 11 });
    const { withinDailyBudget } = await import("./rateLimiter");

    const allowed = await withinDailyBudget("google-places", 10);

    expect(allowed).toBe(false);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].data.callCount).toEqual({ decrement: 1 });
  });

  it("tracks budgets independently per adapter", async () => {
    upsert.mockResolvedValue({ callCount: 1 });
    const { withinDailyBudget } = await import("./rateLimiter");

    await withinDailyBudget("google-places", 5);
    await withinDailyBudget("some-other-adapter", 5);

    expect(upsert.mock.calls[0][0].where.adapter_date.adapter).toBe("google-places");
    expect(upsert.mock.calls[1][0].where.adapter_date.adapter).toBe("some-other-adapter");
  });
});

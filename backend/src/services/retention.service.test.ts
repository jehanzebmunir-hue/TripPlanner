import { beforeEach, describe, expect, it, vi } from "vitest";

const tripFindMany = vi.fn();
const checklistDeleteMany = vi.fn().mockResolvedValue(undefined);
const tripDeleteMany = vi.fn().mockResolvedValue(undefined);
const resetTokenDeleteMany = vi.fn();

vi.mock("../lib/prisma", () => ({
  prisma: {
    trip: {
      findMany: (...a: unknown[]) => tripFindMany(...a),
      deleteMany: (...a: unknown[]) => tripDeleteMany(...a),
    },
    checklistCheck: {
      deleteMany: (...a: unknown[]) => checklistDeleteMany(...a),
    },
    passwordResetToken: {
      deleteMany: (...a: unknown[]) => resetTokenDeleteMany(...a),
    },
  },
}));

describe("sweepStaleAnonymousTrips", () => {
  beforeEach(() => {
    tripFindMany.mockReset();
    checklistDeleteMany.mockClear();
    tripDeleteMany.mockClear();
  });

  it("only queries anonymous trips (userId: null) older than the cutoff", async () => {
    tripFindMany.mockResolvedValue([]);
    const { sweepStaleAnonymousTrips } = await import("./retention.service");

    await sweepStaleAnonymousTrips(90);

    const query = tripFindMany.mock.calls[0][0];
    expect(query.where.userId).toBeNull();
    expect(query.where.updatedAt.lt).toBeInstanceOf(Date);
    // Cutoff should be roughly 90 days ago, not some other window.
    const daysAgo = (Date.now() - query.where.updatedAt.lt.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysAgo).toBeGreaterThan(89.9);
    expect(daysAgo).toBeLessThan(90.1);
  });

  it("does nothing and returns 0 when no trips qualify", async () => {
    tripFindMany.mockResolvedValue([]);
    const { sweepStaleAnonymousTrips } = await import("./retention.service");

    const count = await sweepStaleAnonymousTrips();

    expect(count).toBe(0);
    expect(checklistDeleteMany).not.toHaveBeenCalled();
    expect(tripDeleteMany).not.toHaveBeenCalled();
  });

  it("deletes checklist checks before the trips themselves, and returns the count removed", async () => {
    tripFindMany.mockResolvedValue([{ id: "t1" }, { id: "t2" }]);
    const { sweepStaleAnonymousTrips } = await import("./retention.service");

    const count = await sweepStaleAnonymousTrips();

    expect(count).toBe(2);
    expect(checklistDeleteMany).toHaveBeenCalledWith({ where: { tripId: { in: ["t1", "t2"] } } });
    expect(tripDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ["t1", "t2"] } } });
  });

  it("respects a custom maxAgeDays argument", async () => {
    tripFindMany.mockResolvedValue([]);
    const { sweepStaleAnonymousTrips } = await import("./retention.service");

    await sweepStaleAnonymousTrips(30);

    const query = tripFindMany.mock.calls[0][0];
    const daysAgo = (Date.now() - query.where.updatedAt.lt.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysAgo).toBeGreaterThan(29.9);
    expect(daysAgo).toBeLessThan(30.1);
  });
});

describe("sweepExpiredPasswordResetTokens", () => {
  beforeEach(() => {
    resetTokenDeleteMany.mockReset();
  });

  it("deletes tokens that are either expired or already used, and returns the count", async () => {
    resetTokenDeleteMany.mockResolvedValue({ count: 3 });
    const { sweepExpiredPasswordResetTokens } = await import("./retention.service");

    const count = await sweepExpiredPasswordResetTokens();

    expect(count).toBe(3);
    const query = resetTokenDeleteMany.mock.calls[0][0];
    expect(query.where.OR).toEqual([
      { expiresAt: { lt: expect.any(Date) } },
      { usedAt: { not: null } },
    ]);
  });
});

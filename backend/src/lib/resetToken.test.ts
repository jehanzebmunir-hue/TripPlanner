import { describe, expect, it } from "vitest";
import { generateResetToken, hashResetToken } from "./resetToken";

describe("resetToken", () => {
  it("generates a high-entropy token distinct from its stored hash", () => {
    const { token, tokenHash } = generateResetToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/); // 32 bytes hex
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
    expect(tokenHash).not.toBe(token);
  });

  it("sets an expiry roughly one hour out", () => {
    const before = Date.now();
    const { expiresAt } = generateResetToken();
    const deltaMs = expiresAt.getTime() - before;
    expect(deltaMs).toBeGreaterThan(59 * 60 * 1000);
    expect(deltaMs).toBeLessThanOrEqual(60 * 60 * 1000 + 1000);
  });

  it("never generates the same token twice", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a.token).not.toBe(b.token);
  });

  it("hashResetToken is deterministic, so a stored hash can be looked up again", () => {
    const { token, tokenHash } = generateResetToken();
    expect(hashResetToken(token)).toBe(tokenHash);
  });
});

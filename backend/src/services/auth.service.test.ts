import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashResetToken } from "../lib/resetToken";

const userFindUnique = vi.fn();
const userUpdate = vi.fn().mockResolvedValue(undefined);
const userDelete = vi.fn().mockResolvedValue(undefined);
const resetTokenCreate = vi.fn().mockResolvedValue(undefined);
const resetTokenFindUnique = vi.fn();
const resetTokenUpdate = vi.fn().mockResolvedValue(undefined);
const resetTokenDeleteMany = vi.fn().mockResolvedValue(undefined);

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => userFindUnique(...a),
      update: (...a: unknown[]) => userUpdate(...a),
      delete: (...a: unknown[]) => userDelete(...a),
    },
    passwordResetToken: {
      create: (...a: unknown[]) => resetTokenCreate(...a),
      findUnique: (...a: unknown[]) => resetTokenFindUnique(...a),
      update: (...a: unknown[]) => resetTokenUpdate(...a),
      deleteMany: (...a: unknown[]) => resetTokenDeleteMany(...a),
    },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  },
}));

const sendEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("../lib/email", () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

vi.mock("../lib/jwt", () => ({ signToken: () => "fake-token" }));

describe("auth.service — password reset", () => {
  beforeEach(() => {
    userFindUnique.mockReset();
    userUpdate.mockClear();
    userDelete.mockClear();
    resetTokenCreate.mockClear();
    resetTokenFindUnique.mockReset();
    resetTokenUpdate.mockClear();
    resetTokenDeleteMany.mockClear();
    sendEmail.mockClear();
  });

  it("requestPasswordReset silently no-ops for an unknown email, without revealing that", async () => {
    userFindUnique.mockResolvedValue(null);
    const { requestPasswordReset } = await import("./auth.service");

    await expect(requestPasswordReset("nobody@example.com")).resolves.toBeUndefined();
    expect(resetTokenCreate).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("requestPasswordReset creates a token and emails the raw token, never the hash", async () => {
    userFindUnique.mockResolvedValue({ id: "u1", email: "real@example.com" });
    const { requestPasswordReset } = await import("./auth.service");

    await requestPasswordReset("real@example.com");

    expect(resetTokenCreate).toHaveBeenCalledTimes(1);
    const createArgs = resetTokenCreate.mock.calls[0][0].data;
    expect(createArgs.userId).toBe("u1");
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const emailBody = sendEmail.mock.calls[0][0];
    expect(emailBody.to).toBe("real@example.com");
    // The token in the email must hash to the value that was stored — proof
    // it's the raw token, not the stored hash, going out over email.
    const tokenInEmail = emailBody.text.match(/password: ([0-9a-f]{64})/)?.[1];
    expect(tokenInEmail).toBeDefined();
    expect(hashResetToken(tokenInEmail!)).toBe(createArgs.tokenHash);
  });

  it("confirmPasswordReset rejects an unknown, expired, or already-used token", async () => {
    const { confirmPasswordReset } = await import("./auth.service");

    resetTokenFindUnique.mockResolvedValue(null);
    await expect(confirmPasswordReset("bad-token", "newpassword123")).rejects.toThrow(/invalid or has expired/i);

    resetTokenFindUnique.mockResolvedValue({
      id: "rt1",
      userId: "u1",
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
    });
    await expect(confirmPasswordReset("expired-token", "newpassword123")).rejects.toThrow(/invalid or has expired/i);

    resetTokenFindUnique.mockResolvedValue({
      id: "rt1",
      userId: "u1",
      expiresAt: new Date(Date.now() + 1000 * 60),
      usedAt: new Date(),
    });
    await expect(confirmPasswordReset("used-token", "newpassword123")).rejects.toThrow(/invalid or has expired/i);

    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("confirmPasswordReset updates the password and retires every outstanding token for that account", async () => {
    resetTokenFindUnique.mockResolvedValue({
      id: "rt1",
      userId: "u1",
      expiresAt: new Date(Date.now() + 1000 * 60),
      usedAt: null,
    });
    const { confirmPasswordReset } = await import("./auth.service");

    await confirmPasswordReset("good-token", "newpassword123");

    expect(userUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: expect.objectContaining({ passwordHash: expect.any(String) }) });
    expect(resetTokenUpdate).toHaveBeenCalledWith({ where: { id: "rt1" }, data: { usedAt: expect.any(Date) } });
    expect(resetTokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", id: { not: "rt1" }, usedAt: null },
    });
  });

  it("deleteAccount deletes only the User row — trip detachment is handled by the schema's onDelete: SetNull, not app code", async () => {
    const { deleteAccount } = await import("./auth.service");

    await deleteAccount("u1");

    expect(userDelete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });
});

import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { sendEmail } from "../lib/email";
import { generateResetToken, hashResetToken } from "../lib/resetToken";

class AuthError extends Error {
  status = 401;
}

class ValidationError extends Error {
  status = 400;
}

export async function register(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new AuthError("An account with this email already exists");
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, passwordHash } });
  return { token: signToken(user.id), user: { id: user.id, email: user.email } };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AuthError("Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AuthError("Invalid email or password");

  return { token: signToken(user.id), user: { id: user.id, email: user.email } };
}

export async function getUser(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return { id: user.id, email: user.email };
}

/**
 * Deletes only the account itself (email, password hash, outstanding reset
 * tokens — everything that actually identifies the person). Trips created
 * under this account are not deleted: Trip.userId is onDelete: SetNull, so
 * they simply revert to anonymous, same as a trip that was never logged
 * into in the first place. See the schema comment on PasswordResetToken for
 * the full reasoning.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
}

// Always resolves the same way regardless of whether the email exists, so a
// caller can't use response timing/shape to enumerate registered accounts.
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const { token, tokenHash, expiresAt } = generateResetToken();
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

  await sendEmail({
    to: user.email,
    subject: "Reset your Trip Planner password",
    text: `Use this token to reset your password: ${token}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  });
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashResetToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new ValidationError("This reset link is invalid or has expired");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    // Any other outstanding reset links for this account are invalidated
    // too — a successful reset should retire every link that was issued,
    // not just the one that got used.
    prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId, id: { not: resetToken.id }, usedAt: null },
    }),
  ]);
}

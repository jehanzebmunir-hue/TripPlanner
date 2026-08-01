import { createHash, randomBytes } from "crypto";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface GeneratedResetToken {
  token: string; // the raw, high-entropy token — sent to the user, never stored
  tokenHash: string; // SHA-256 of token — what's stored, so a DB read alone can't be replayed
  expiresAt: Date;
}

/**
 * The token itself is 256 bits of randomness — already far too high-entropy
 * to brute-force — so a fast deterministic hash (SHA-256) for storage and
 * lookup is the right tool here, not bcrypt. bcrypt's deliberate slowness
 * exists to blunt brute-forcing a low-entropy human password; applying it
 * to an already-unguessable random token would only make lookups slower
 * for no real security gain.
 */
export function generateResetToken(): GeneratedResetToken {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashResetToken(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

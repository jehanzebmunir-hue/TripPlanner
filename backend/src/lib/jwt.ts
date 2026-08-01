import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET ?? "dev-only-secret";

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, SECRET) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

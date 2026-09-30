import crypto from "crypto";

/**
 * Hashes a password using Node's native scrypt algorithm with a random salt.
 * Output format: "salt:hash"
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a password against a scrypt salted hash using timing-safe comparison.
 */
export function verifyPassword(password: string, hash: string): boolean {
  try {
    const parts = hash.split(":");
    if (parts.length !== 2) return false;

    const [salt, key] = parts;
    if (!salt || !key || key.length % 2 !== 0) return false;

    const keyBuffer = Buffer.from(key, "hex");
    if (keyBuffer.length === 0) return false;

    const derivedKey = crypto.scryptSync(password, salt, 64, {
      N: 16384,
      r: 8,
      p: 1,
    });

    if (keyBuffer.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

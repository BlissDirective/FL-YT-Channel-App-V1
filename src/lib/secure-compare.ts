import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison for bearer secrets. Hashing both sides
 * first makes the buffers equal-length (timingSafeEqual requirement) and
 * keeps the comparison independent of where the strings first differ.
 */
export function secureEquals(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

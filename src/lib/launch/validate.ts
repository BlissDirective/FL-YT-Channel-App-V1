/**
 * Launch waitlist — pure input validation & normalization (unit-tested).
 * Kept separate from the "use server" action module (which may only export
 * async functions) so the rules are testable without a request/database.
 */

// Deliberately conservative, not RFC-exhaustive: one @, a dotted domain, no
// spaces. Good enough to reject typos/bots without frustrating real emails.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  const e = normalizeEmail(raw);
  return e.length <= 254 && EMAIL_RE.test(e);
}

/** UTM keys we persist. Anything else on the query string is ignored, and each
    value is trimmed and length-capped so the jsonb blob stays small + safe. */
export const UTM_KEYS = ["source", "medium", "campaign", "term", "content"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];

export function sanitizeUtm(raw: Record<string, unknown> | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (const k of UTM_KEYS) {
    const v = raw[k];
    if (typeof v === "string") {
      const trimmed = v.trim().slice(0, 200);
      if (trimmed) out[k] = trimmed;
    }
  }
  return out;
}

/** Best-effort referrer normalization: keep it a bounded string or undefined. */
export function sanitizeReferrer(raw: string | null | undefined): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim().slice(0, 500);
  return t || undefined;
}

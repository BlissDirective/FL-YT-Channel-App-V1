/**
 * Admin allowlist — pure decision logic (no I/O, unit-tested).
 *
 * The app is still single-tenant: every authenticated user is "the operator."
 * The admin marker adds one boundary on top — a small set of owner emails that
 * may reach the most powerful/destructive controls (global kill switch, VCE
 * feature flags, danger-zone purge, the MVDA scoreboard). The allowlist comes
 * from the ADMIN_EMAILS env var; this module only decides membership so the
 * rule is testable without a session or a database.
 *
 * See Fable5-Admin-and-Launch-Hero-Build-Spec.md, Part A.
 */

/** Thrown when an authenticated user is not on the admin allowlist. Distinct
    from UnauthorizedError (no session at all) so callers/UX can tell "log in"
    from "you don't have access." */
export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

/** Normalize a raw ADMIN_EMAILS value ("a@x.com, B@X.com") into a deduped,
    lower-cased, trimmed list. Undefined/empty → no admins (fail closed). */
export function parseAdminEmails(raw?: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const e = part.trim().toLowerCase();
    if (e) seen.add(e);
  }
  return [...seen];
}

/** True when the email is on the (already-normalized) allowlist. */
export function isAdminEmail(email: string | null | undefined, allowlist: string[]): boolean {
  if (!email) return false;
  return allowlist.includes(email.trim().toLowerCase());
}

/** Decide admin from a session-user shape + allowlist. Null user → false. */
export function decideAdmin(
  user: { email?: string | null } | null | undefined,
  allowlist: string[],
): boolean {
  return isAdminEmail(user?.email, allowlist);
}

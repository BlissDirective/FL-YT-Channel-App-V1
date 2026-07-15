import "server-only";
import { createClient } from "@/lib/supabase/server";
import { UnauthorizedError } from "@/lib/auth-guard";
import { ForbiddenError, parseAdminEmails, decideAdmin } from "@/lib/admin-emails";

/**
 * Admin authorization guard (server side).
 *
 * Wires the current session + the ADMIN_EMAILS allowlist to the pure
 * decideAdmin() rule. `assertAdmin()` is the first line of every admin-only
 * server action (kill switch, VCE flags, danger-zone purge); `getIsAdmin()`
 * conditions admin-only UI. With the operator's own email in ADMIN_EMAILS,
 * nothing changes for them — the boundary exists for when non-admin users
 * eventually arrive.
 *
 * See Fable5-Admin-and-Launch-Hero-Build-Spec.md, Part A.
 */

export { ForbiddenError };

/** The admin allowlist from the environment (normalized). Empty → no admins. */
export function getAdminEmails(): string[] {
  return parseAdminEmails(process.env.ADMIN_EMAILS);
}

async function currentUser(): Promise<{ id: string; email?: string | null } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** True when the current session belongs to an allowlisted admin. Never throws
    — safe for conditional rendering (returns false when logged out). */
export async function getIsAdmin(): Promise<boolean> {
  const user = await currentUser();
  return decideAdmin(user, getAdminEmails());
}

/** Throw unless the caller is an authenticated admin. Returns the user id.
    UnauthorizedError when there is no session; ForbiddenError when the session
    is valid but not on the allowlist. */
export async function assertAdmin(): Promise<string> {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  if (!decideAdmin(user, getAdminEmails())) throw new ForbiddenError();
  return user.id;
}

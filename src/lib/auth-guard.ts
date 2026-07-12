import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-action authorization guard (security hardening).
 *
 * The app's page routes are gated by src/middleware.ts, but Next.js dispatches
 * server actions by hashed action-ID rather than strictly by path — a POST to
 * ANY route the middleware lets through (e.g. the public /login) can carry
 * another action's ID. Actions that use the anon-keyed client are still fenced
 * by RLS (the anon role has no policy → denied), but actions that use the
 * SERVICE-ROLE client bypass RLS entirely. Those must verify the caller
 * themselves. `assertOperator()` is the first line of every service-role
 * action: it reads the session from the request cookies and throws when there
 * is no authenticated user, so the action never runs for an anonymous caller.
 */
export class UnauthorizedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthorizedError";
  }
}

/** Throw unless the request carries a valid operator session. Returns the
    user id for callers that want to attribute the action. */
export async function assertOperator(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();
  return user.id;
}

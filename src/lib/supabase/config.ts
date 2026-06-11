/**
 * Supabase client configuration.
 *
 * The URL and anon key are PUBLIC values by design — they ship in the
 * browser bundle of every Supabase app and are safe to commit (data
 * access is enforced by Row Level Security, and signups are disabled in
 * favor of the service-role-gated bootstrap). Env vars override the
 * committed defaults so the project can be repointed without a code
 * change. The service-role key is NEVER committed — env-only.
 */

const DEFAULT_SUPABASE_URL = "https://reffwibuitzrkertuuvy.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlZmZ3aWJ1aXR6cmtlcnR1dXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTkzOTcsImV4cCI6MjA5Njc3NTM5N30.J1EfNUHU9XKsTYMYQ3WmbGlXiiAvtoRxvQU-AJVVsMg";

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

/** True when the public client config is available (always, with the
    committed defaults — kept for repointability and tests). */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

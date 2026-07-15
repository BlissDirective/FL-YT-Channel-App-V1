"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  isValidEmail,
  normalizeEmail,
  sanitizeUtm,
  sanitizeReferrer,
} from "@/lib/launch/validate";

/**
 * Join the pre-launch waitlist (public, unauthenticated). Runs with the anon
 * client, so the launch_leads RLS insert-only policy fences it. Defenses:
 *  - honeypot: a hidden field bots fill → we return success without inserting.
 *  - rate limit: best-effort per-IP token bucket (per warm instance).
 *  - unique email: duplicate signups upsert silently (reported as `already`).
 * Single opt-in for now; the Resend double-opt-in is a deferred, additive step.
 */

export type JoinResult = { ok: boolean; already?: boolean; error?: string };

type JoinInput = {
  email: string;
  source?: string;
  referrer?: string;
  utm?: Record<string, string>;
  /** Honeypot — must be empty for a real human. */
  company?: string;
};

// Best-effort in-memory limiter. Serverless instances are ephemeral and not
// shared, so this throttles obvious floods without pretending to be a global
// rate limiter (the unique-email constraint is the real dedupe).
const HITS = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (HITS.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  HITS.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function joinLaunchList(input: JoinInput): Promise<JoinResult> {
  // Honeypot: silently accept so the bot sees success and moves on.
  if (input.company && input.company.trim() !== "") return { ok: true };

  const email = normalizeEmail(input.email ?? "");
  if (!isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return { ok: false, error: "Too many attempts — please try again in a minute." };
  }

  const referrer = sanitizeReferrer(input.referrer ?? hdrs.get("referer"));
  const utm = sanitizeUtm(input.utm);
  const source = (input.source ?? "launch").slice(0, 60);

  const supabase = await createClient();

  // Was this email already on the list? (Best-effort — anon can't read, so we
  // detect the conflict via the insert result instead.)
  const { error } = await supabase
    .from("launch_leads")
    .insert({
      email,
      source,
      referrer: referrer ?? null,
      utm,
      consent_at: new Date().toISOString(),
    });

  if (error) {
    // Unique violation → already on the list; treat as success.
    if (error.code === "23505") return { ok: true, already: true };
    return { ok: false, error: "Couldn't join right now — please try again." };
  }
  return { ok: true };
}

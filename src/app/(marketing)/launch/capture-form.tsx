"use client";

import { useState, useTransition } from "react";
import { joinLaunchList } from "@/lib/actions/launch";
import { UTM_KEYS } from "@/lib/launch/validate";

/**
 * Waitlist capture — the only interactive element above the fold. Honeypot
 * ("company") drops bots; consent line links the draft legal pages; on success
 * it swaps to a share prompt (the page's single viral hook). Repeated verbatim
 * at hero, mid-page, and final capture via the `source` prop.
 */

const SHARE_TEXT =
  "Full automation. Zero blind trust. Faceless Studio runs a YouTube channel end-to-end — and you keep the veto. Beta opens September 14.";

function readUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const v = p.get(`utm_${k}`);
    if (v) out[k] = v;
  }
  return out;
}

export function CaptureForm({ source, size = "md" }: { source: string; size?: "md" | "lg" }) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [done, setDone] = useState<null | { already: boolean }>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}`;
    return (
      <div className="rounded-2xl border border-[var(--m-line)] bg-[var(--m-card)] p-5 text-center">
        <p className="text-lg font-semibold text-[var(--m-ink)]">
          {done.already ? "You're already on the beta list ✓" : "You're on the beta list ✓"}
        </p>
        <p className="mt-1 text-sm text-[var(--m-muted)]">
          The beta opens September 14th — watch your inbox for the invite.
          Founding-operator pricing is locked for the list.
        </p>
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--m-line)] px-4 py-2 text-sm font-medium text-[var(--m-ink)] transition-colors hover:bg-white/5"
        >
          Share it →
        </a>
      </div>
    );
  }

  const submit = () => {
    setError(null);
    start(async () => {
      const res = await joinLaunchList({
        email,
        source,
        company,
        referrer: typeof document !== "undefined" ? document.referrer : undefined,
        utm: readUtm(),
      }).catch(() => ({ ok: false as const, error: "Something went wrong — try again." }));
      if (res.ok) setDone({ already: Boolean("already" in res && res.already) });
      else setError(res.error ?? "Couldn't join — try again.");
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="w-full"
      noValidate
    >
      <div className={`flex flex-col gap-2 sm:flex-row ${size === "lg" ? "sm:gap-3" : ""}`}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@channel.com"
          autoComplete="email"
          aria-label="Email address"
          className={`flex-1 rounded-full border border-[var(--m-line)] bg-black/30 px-5 text-[var(--m-ink)] outline-none placeholder:text-[var(--m-muted)] focus:border-[var(--m-amber)]/50 focus:ring-2 focus:ring-[var(--m-amber)]/20 ${
            size === "lg" ? "py-3.5 text-base" : "py-3 text-sm"
          }`}
        />
        {/* Honeypot — visually hidden, off-screen, not announced. */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          name="company"
          className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
        />
        <button
          type="submit"
          disabled={pending}
          className={`rounded-full bg-[var(--m-amber)] px-6 font-semibold text-[var(--m-on-accent)] shadow-[0_0_30px_-8px_var(--m-amber)] transition-transform hover:scale-[1.02] disabled:opacity-60 ${
            size === "lg" ? "py-3.5 text-base" : "py-3 text-sm"
          }`}
        >
          {pending ? "Joining…" : <span className="m-shiny">Join the beta</span>}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs font-medium text-[var(--m-amber)]" role="alert">
          {error}
        </p>
      )}
      <p className="mt-2 text-xs text-[var(--m-muted)]">
        Sign up for the beta — doors open <span className="font-medium text-[var(--m-ink)]">September 14th</span>, and
        founding-operator pricing is locked for the list. No spam — your invite plus a couple of build-log notes.
        By joining you agree to our{" "}
        <a href="/legal/privacy" className="underline hover:text-[var(--m-ink)]">
          Privacy Policy
        </a>{" "}
        and{" "}
        <a href="/legal/terms" className="underline hover:text-[var(--m-ink)]">
          Terms
        </a>
        .
      </p>
    </form>
  );
}

"use client";

/**
 * Password reset landing (forgot-password flow, step 2). The recovery email
 * link redirects here; the browser Supabase client auto-detects the recovery
 * token in the URL (PKCE `?code=` or an implicit `#access_token` fragment) and
 * fires PASSWORD_RECOVERY, which unlocks the set-new-password form. Doing both
 * the request (on /login) and this step with the browser client keeps the PKCE
 * verifier in the same browser, so the exchange succeeds.
 *
 * This route is public (see PUBLIC_PATHS in middleware) because the operator is
 * logged out when they arrive.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Phase = "checking" | "ready" | "invalid" | "saving" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) setPhase("ready");
    });

    // Fallback for the case where detection already completed before the
    // listener attached, plus a grace window before declaring the link dead.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) setPhase("ready");
      else
        setTimeout(() => {
          if (active) setPhase((p) => (p === "checking" ? "invalid" : p));
        }, 3000);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setPhase("saving");
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setPhase("ready");
      return;
    }
    setPhase("done");
    setTimeout(() => router.replace("/"), 1200);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-6 pt-4">
      <div className="flex flex-col items-center gap-3">
        <span className="grid size-14 place-items-center rounded-3xl bg-raised text-accent">
          <Sparkles className="size-7" fill="currentColor" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
      </div>

      <div className="w-full rounded-card bg-card p-6 shadow-card">
        {phase === "checking" && (
          <p className="text-sm text-muted">Verifying your reset link…</p>
        )}

        {phase === "invalid" && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-coral">
              This reset link is invalid or has expired.
            </p>
            <p className="text-sm text-muted">
              Request a fresh one from the sign-in screen.
            </p>
            <a
              href="/login"
              className="inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent shadow-card"
            >
              Back to sign in
            </a>
          </div>
        )}

        {phase === "done" && (
          <p className="text-sm font-medium text-success">
            Password updated. Signing you in…
          </p>
        )}

        {(phase === "ready" || phase === "saving") && (
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">New password</span>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-card-warm px-4 py-2.5 text-sm outline-none ring-accent/40 focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Confirm new password</span>
              <input
                type="password"
                name="confirm"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl bg-card-warm px-4 py-2.5 text-sm outline-none ring-accent/40 focus:ring-2"
              />
            </label>

            {error && (
              <p className="rounded-xl bg-coral/10 px-3 py-2 text-sm font-medium text-coral">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={phase === "saving"}
              className="w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent shadow-card transition-transform hover:scale-[1.01] disabled:opacity-60"
            >
              {phase === "saving" ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

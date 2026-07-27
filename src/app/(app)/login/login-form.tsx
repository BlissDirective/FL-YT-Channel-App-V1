"use client";

import { useActionState, useState } from "react";
import { bootstrapAccount, signIn, type AuthResult } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { PillTabs } from "@/components/ui/pill-tabs";

const INITIAL: AuthResult = {};

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState("signin");
  const [signInState, signInAction, signInPending] = useActionState(
    signIn,
    INITIAL,
  );
  const [bootState, bootAction, bootPending] = useActionState(
    bootstrapAccount,
    INITIAL,
  );

  // Forgot-password is a client-side flow: the browser client sends the
  // recovery email (keeping the PKCE verifier in this browser) and the
  // /auth/reset page completes it. See src/app/(app)/auth/reset/page.tsx.
  const [resetEmail, setResetEmail] = useState("");
  const [resetPending, setResetPending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetPending(true);
    setResetError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      resetEmail.trim(),
      { redirectTo: `${window.location.origin}/auth/reset` },
    );
    setResetPending(false);
    // Don't reveal whether the address has an account — always confirm.
    if (error && !/rate limit|too many/i.test(error.message)) {
      setResetSent(true);
    } else if (error) {
      setResetError(error.message);
    } else {
      setResetSent(true);
    }
  }

  const error = mode === "signin" ? signInState.error : bootState.error;
  const pending = mode === "signin" ? signInPending : bootPending;

  if (mode === "forgot") {
    return (
      <div className="w-full rounded-card bg-card p-6 shadow-card">
        <h2 className="mb-1 text-lg font-semibold">Reset your password</h2>
        <p className="mb-5 text-sm text-muted">
          Enter your email and we&apos;ll send a link to set a new password.
        </p>

        {resetSent ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success">
              If an account exists for that email, a reset link is on its way.
              Check your inbox (and spam).
            </p>
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setResetSent(false);
              }}
              className="text-sm font-medium text-accent hover:underline"
            >
              ← Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={sendReset} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Email</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full rounded-xl bg-card-warm px-4 py-2.5 text-sm outline-none ring-accent/40 focus:ring-2"
              />
            </label>

            {resetError && (
              <p className="rounded-xl bg-coral/10 px-3 py-2 text-sm font-medium text-coral">
                {resetError}
              </p>
            )}

            <button
              type="submit"
              disabled={resetPending}
              className="w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent shadow-card transition-transform hover:scale-[1.01] disabled:opacity-60"
            >
              {resetPending ? "Sending…" : "Send reset link"}
            </button>

            <button
              type="button"
              onClick={() => setMode("signin")}
              className="block w-full text-center text-sm font-medium text-muted hover:text-ink"
            >
              ← Back to sign in
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="w-full rounded-card bg-card p-6 shadow-card">
      <div className="mb-5 flex justify-center">
        <PillTabs
          options={[
            { label: "Sign in", value: "signin" },
            { label: "First-time setup", value: "bootstrap" },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>

      <form
        action={mode === "signin" ? signInAction : bootAction}
        className="space-y-3"
      >
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full rounded-xl bg-card-warm px-4 py-2.5 text-sm outline-none ring-accent/40 focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Password</span>
          <input
            type="password"
            name="password"
            required
            minLength={mode === "bootstrap" ? 8 : undefined}
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
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
          disabled={pending}
          className="w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent shadow-card transition-transform hover:scale-[1.01] disabled:opacity-60"
        >
          {pending
            ? "Working…"
            : mode === "signin"
              ? "Sign in"
              : "Create operator account"}
        </button>

        {mode === "signin" && (
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className="block w-full text-center text-sm font-medium text-muted hover:text-ink"
          >
            Forgot password?
          </button>
        )}

        {mode === "bootstrap" && (
          <p className="text-center text-xs text-muted">
            Only available before any account exists.
          </p>
        )}
      </form>
    </div>
  );
}

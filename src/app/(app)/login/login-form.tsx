"use client";

import { useActionState, useState } from "react";
import { bootstrapAccount, signIn, type AuthResult } from "@/lib/actions/auth";
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

  const error = mode === "signin" ? signInState.error : bootState.error;
  const pending = mode === "signin" ? signInPending : bootPending;

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
          className="w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink shadow-card transition-transform hover:scale-[1.01] disabled:opacity-60"
        >
          {pending
            ? "Working…"
            : mode === "signin"
              ? "Sign in"
              : "Create operator account"}
        </button>

        {mode === "bootstrap" && (
          <p className="text-center text-xs text-muted">
            Only available before any account exists.
          </p>
        )}
      </form>
    </div>
  );
}

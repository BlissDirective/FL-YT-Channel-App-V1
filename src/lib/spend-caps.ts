/**
 * Spend-cap switch (operator decision, Sep 2026).
 *
 * All MONTHLY spend caps (the portfolio AI-video cap and the per-project /
 * portfolio monthly budgets) are SUSPENDED until the operator authorizes them
 * again, so the Higgsfield production push is never paused by a cap. Spend is
 * still recorded to the ledger — only the blocking checks are bypassed.
 *
 * Re-enable: set `SPEND_CAPS_ENABLED=true` (Vercel env + GitHub Actions var).
 *
 * Client-safe (no server-only import) so UI can show "caps suspended".
 */
export function spendCapsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return (env.SPEND_CAPS_ENABLED ?? "").toLowerCase() === "true";
}

/** Human-readable note for UI + pause messages. */
export const SPEND_CAPS_SUSPENDED_NOTE =
  "Monthly spend caps are suspended until re-authorized (SPEND_CAPS_ENABLED=true).";

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Provider circuit-breaker (Enhancement Plan Phase 2.5). When a paid
 * provider reports a terminal account condition (exhausted balance, locked
 * account), retrying every cron pass burns Actions minutes and log noise for
 * days — the June fal outage ran two weeks. Adapters trip the breaker; the
 * pipeline checks it before paid stages; a later successful call (or the
 * Settings "Test" button) clears it.
 */

type Db = ReturnType<typeof createAdminClient>;

const KEY = (provider: string) => `provider_down_${provider}`;

export type ProviderOutage = { down: true; reason: string; since: string } | { down: false };

/** Trip the breaker (idempotent; notifies only on the closed→open transition). */
export async function markProviderDown(provider: string, reason: string): Promise<void> {
  upMemo.delete(provider); // next success must actually clear the flag
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("app_settings")
      .select("value")
      .eq("key", KEY(provider))
      .maybeSingle();
    const already = Boolean((data?.value as { down?: boolean } | null)?.down);
    await db.from("app_settings").upsert({
      key: KEY(provider),
      value: { down: true, reason: reason.slice(0, 300), since: new Date().toISOString() },
    });
    if (!already) {
      console.error(`⛔ provider ${provider} marked DOWN: ${reason}`);
      // Best-effort notifications; neither may block the pipeline.
      try {
        const { sendTelegram } = await import("@/lib/adapters/telegram");
        await sendTelegram(
          `⛔ <b>${provider} paused</b>\n${reason.slice(0, 200)}\n\nPipelines that need ${provider} are holding. Fix the account, then hit Test in Settings (or wait for the next successful call) to resume.`,
        );
      } catch { /* ignore */ }
      try {
        const { sendPushToAll } = await import("@/lib/push");
        await sendPushToAll({
          title: `${provider} paused`,
          body: reason.slice(0, 140),
          url: "/settings",
        });
      } catch { /* ignore */ }
    }
  } catch (err) {
    console.error("markProviderDown failed:", err);
  }
}

/** Clear the breaker after a successful call (only writes when it was open).
    Memoized per-instance so hot paths don't pay a DB read per provider call. */
const upMemo = new Map<string, number>();

export async function markProviderUp(provider: string): Promise<void> {
  const now = Date.now();
  if ((upMemo.get(provider) ?? 0) > now - 60_000) return;
  upMemo.set(provider, now);
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("app_settings")
      .select("value")
      .eq("key", KEY(provider))
      .maybeSingle();
    if (!(data?.value as { down?: boolean } | null)?.down) return;
    await db.from("app_settings").upsert({ key: KEY(provider), value: { down: false } });
    console.log(`✅ provider ${provider} back UP`);
  } catch {
    /* clearing is best-effort */
  }
}

export async function providerOutage(db: Db, provider: string): Promise<ProviderOutage> {
  const { data } = await db
    .from("app_settings")
    .select("value")
    .eq("key", KEY(provider))
    .maybeSingle();
  const v = data?.value as { down?: boolean; reason?: string; since?: string } | null;
  return v?.down
    ? { down: true, reason: v.reason ?? "provider outage", since: v.since ?? "" }
    : { down: false };
}

/** Message patterns that mean "the account is broken, retries won't help". */
export function isTerminalProviderError(message: string): boolean {
  return /exhausted balance|user is locked|payment required|quota exceeded.*billing|account (suspended|disabled)/i.test(
    message,
  );
}

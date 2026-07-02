import { getServiceHealth } from "@/lib/adapters/health";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";

const PULSE_PROVIDERS = ["anthropic", "elevenlabs", "fal", "youtube"] as const;
const SHORT_LABEL: Record<string, string> = {
  anthropic: "Claude",
  elevenlabs: "ElevenLabs",
  fal: "fal",
  youtube: "YouTube",
};

/** Slim "is everything alive" strip for the dashboard: provider dots
    (green = live key, grey = mock, coral = flagged down), month-to-date
    spend, and stalled-video count. */
export async function SystemPulse({
  spendUsd,
  budgetUsd,
  needsAttention,
}: {
  spendUsd: number;
  budgetUsd: number;
  needsAttention: number;
}) {
  const services = getServiceHealth().filter((s) =>
    (PULSE_PROVIDERS as readonly string[]).includes(s.key),
  );

  // The render farm / crons flag a struggling provider via app_settings
  // (e.g. key "provider_down_fal", value { down: true }).
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in(
      "key",
      PULSE_PROVIDERS.map((k) => `provider_down_${k}`),
    );
  const down = new Set(
    (data ?? [])
      .filter((r) => Boolean((r.value as { down?: boolean })?.down))
      .map((r) => r.key.replace("provider_down_", "")),
  );

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-card bg-card-warm px-4 py-2.5 shadow-card">
      <div className="flex flex-wrap items-center gap-3">
        {services.map((s) => {
          const isDown = down.has(s.key);
          return (
            <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted">
              <span
                className={cn(
                  "size-2 rounded-full",
                  isDown ? "bg-coral" : s.present ? "bg-success" : "bg-muted/40",
                )}
              />
              {SHORT_LABEL[s.key]}
              {isDown ? " · down" : s.present ? "" : " · mock"}
            </span>
          );
        })}
      </div>
      <span className="text-xs text-muted">
        <span className="font-semibold tabular-nums text-ink">
          ${spendUsd.toFixed(2)}
        </span>{" "}
        of ${budgetUsd.toFixed(0)} this month
      </span>
      {needsAttention > 0 && (
        <span className="text-xs font-semibold text-coral">
          {needsAttention} video{needsAttention === 1 ? "" : "s"} need
          {needsAttention === 1 ? "s" : ""} attention
        </span>
      )}
    </div>
  );
}

import { getServiceHealth } from "@/lib/adapters/health";
import { getCostLedger, getKillSwitch } from "@/lib/db/queries";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/cn";
import { KillSwitch } from "./kill-switch";
import { NotificationsCard } from "./notifications-card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const services = getServiceHealth();
  const configured = isSupabaseConfigured();
  const [killSwitch, ledger] = configured
    ? await Promise.all([getKillSwitch(), getCostLedger(12)])
    : [false, []];
  const shownTotal = ledger.reduce((s, e) => s + Number(e.usd), 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Connection health and global configuration
        </p>
      </div>

      {configured && (
        <Card>
          <CardTitle>Pipeline control</CardTitle>
          <KillSwitch enabled={killSwitch} />
        </Card>
      )}

      <NotificationsCard
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
      />

      <Card>
        <CardTitle>Credentials health</CardTitle>
        <p className="mb-4 text-sm text-muted">
          Each service is wired as a mock until its key is present, so the app
          works end-to-end before everything is connected. Keys are read from
          the deployment environment — values are never shown here.
        </p>
        <ul className="divide-y divide-line">
          {services.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "size-2.5 rounded-full",
                    s.present ? "bg-success" : "bg-muted/40",
                  )}
                />
                <div>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted">Needed by Phase {s.phase}</p>
                </div>
              </div>
              {s.present ? (
                <StatusChip tone="success">Connected</StatusChip>
              ) : s.required ? (
                <StatusChip tone="coral">Missing</StatusChip>
              ) : (
                <StatusChip tone="neutral">Mock mode</StatusChip>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>Cost ledger</CardTitle>
        {ledger.length === 0 ? (
          <p className="text-sm text-muted">
            No provider calls recorded yet. Every pipeline stage writes its
            cost here — run the demo pipeline to see entries appear.
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted">
              Recent provider calls (the budget guard checks this ledger before
              every paid stage).
            </p>
            <ul className="divide-y divide-line">
              {ledger.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.description}</p>
                    <p className="text-xs text-muted">
                      {e.provider} · {new Date(e.at).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    ${Number(e.usd).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-line pt-3 text-right text-sm font-semibold">
              Shown total: ${shownTotal.toFixed(2)}
            </p>
          </>
        )}
      </Card>
    </div>
  );
}

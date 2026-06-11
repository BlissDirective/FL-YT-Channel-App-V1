import { getServiceHealth } from "@/lib/adapters/health";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/cn";

export default function SettingsPage() {
  const services = getServiceHealth();

  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Connection health and global configuration
        </p>
      </div>

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
        <p className="text-sm text-muted">
          Per-video and monthly spend tracking arrives with the production
          pipeline in Phase 3.
        </p>
      </Card>
    </div>
  );
}

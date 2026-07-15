import { getServiceHealth, TESTABLE_SERVICES } from "@/lib/adapters/health";
import { getCostLedger, getKillSwitch, getQcAgreement } from "@/lib/db/queries";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { QualityGates } from "@/lib/actions/pipeline";
import { Card, CardTitle } from "@/components/ui/card";
import { KillSwitch } from "./kill-switch";
import { VceSystemsCard } from "./vce-systems-card";
import { getVceFlags, VCE_DEFAULTS } from "@/lib/pipeline/vce";
import { getIsAdmin } from "@/lib/admin-guard";
import { NotificationsCard } from "./notifications-card";
import { CredentialHealthList } from "./credential-health";
import { QualityGatesCard } from "./quality-gates-card";
import { PurgeDemoData } from "./danger-zone";
import { JudgeCalibration } from "@/app/insights/judge-calibration";
import { MvdaScoreboard } from "./mvda-scoreboard";

async function getQualityGates(): Promise<QualityGates> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "quality_gates")
    .maybeSingle();
  return (data?.value as QualityGates) ?? {};
}

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const services = getServiceHealth();
  const configured = isSupabaseConfigured();
  const [killSwitch, ledger, qc, qualityGates] = configured
    ? await Promise.all([getKillSwitch(), getCostLedger(12), getQcAgreement(), getQualityGates()])
    : [false, [], { total: 0, agree: 0, rate: 0 }, {}];
  const vceFlags = configured ? await getVceFlags() : VCE_DEFAULTS;
  const isAdmin = configured ? await getIsAdmin() : false;
  const shownTotal = ledger.reduce((s, e) => s + Number(e.usd), 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Connection health and global configuration
        </p>
      </div>

      {configured && isAdmin && (
        <Card>
          <CardTitle>Pipeline control</CardTitle>
          <KillSwitch enabled={killSwitch} />
        </Card>
      )}

      <NotificationsCard
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
      />

      {configured && <QualityGatesCard initial={qualityGates} />}

      {configured && isAdmin && <VceSystemsCard initial={vceFlags} />}

      {configured && <JudgeCalibration />}

      {configured && isAdmin && <MvdaScoreboard />}

      {configured && (
        <Card>
          <CardTitle>QC agent agreement</CardTitle>
          {qc.total === 0 ? (
            <p className="text-sm text-muted">
              No overlap yet. As the QC agent scores gates you also decide on, this
              shows how often it agreed with you — your signal for when it&apos;s
              safe to raise a gate to Co-pilot or Autopilot.
            </p>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums">
                  {Math.round(qc.rate * 100)}%
                </span>
                <span className="text-sm text-muted">
                  agreement over {qc.total} decided gate{qc.total === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                {qc.rate >= 0.8
                  ? "High agreement — consider raising your most-trusted gates to Co-pilot."
                  : "Building confidence — keep reviewing manually until agreement climbs."}
              </p>
            </>
          )}
        </Card>
      )}

      <Card>
        <CardTitle>Credentials health</CardTitle>
        <p className="mb-4 text-sm text-muted">
          Each service is wired as a mock until its key is present, so the app
          works end-to-end before everything is connected. Keys are read from
          the deployment environment — values are never shown here. Use{" "}
          <span className="font-medium text-ink">Test</span> to live-ping a
          connected provider.
        </p>
        <CredentialHealthList
          services={services.map((s) => ({
            ...s,
            testable: TESTABLE_SERVICES.includes(s.key as (typeof TESTABLE_SERVICES)[number]),
          }))}
        />
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

      {configured && isAdmin && (
        <Card>
          <CardTitle>Danger zone</CardTitle>
          <PurgeDemoData />
        </Card>
      )}
    </div>
  );
}

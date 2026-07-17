import Link from "next/link";
import { DollarSign } from "lucide-react";
import { reconcileCosts } from "@studio/core";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  getAllCostEntries,
  getMonthlyBudgetUsd,
  getProjects,
} from "@/lib/db/queries";
import { Card, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { CostReconciliationPanel } from "@/components/dashboard/cost-reconciliation";
import { CostLog, type CostRow } from "./cost-log";

export const dynamic = "force-dynamic";

export default async function CostsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="pt-2">
        <Card className="max-w-xl">
          <CardTitle>Spend log</CardTitle>
          <p className="text-sm text-muted">
            Connect Supabase to record and view provider spend.
          </p>
        </Card>
      </div>
    );
  }

  const [entries, projects, monthlyBudget] = await Promise.all([
    getAllCostEntries(),
    getProjects(),
    getMonthlyBudgetUsd(),
  ]);

  const nameById = new Map(projects.map((p) => [p.id, p.name]));
  const rows: CostRow[] = entries.map((e) => ({
    id: e.id,
    at: e.at,
    provider: e.provider,
    description: e.description,
    usd: Number(e.usd),
    projectId: e.project_id,
    projectName: e.project_id
      ? (nameById.get(e.project_id) ?? "Deleted project")
      : "Unattributed",
  }));

  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();
  const monthTotal = rows
    .filter((r) => r.at >= monthStart)
    .reduce((s, r) => s + r.usd, 0);
  const allTimeTotal = rows.reduce((s, r) => s + r.usd, 0);

  // Provenance-linked cost reconciliation (list2-#6): ledger vs. asset manifest.
  const supabase = await createClient();
  const { data: assetRows } = await supabase
    .from("assets")
    .select("kind, provider, cost_usd")
    .gt("cost_usd", 0)
    .limit(5000);
  const recon = reconcileCosts(
    entries.map((e) => ({ provider: e.provider, usd: Number(e.usd), videoId: e.video_id })),
    ((assetRows ?? []) as { kind: string; provider: string | null; cost_usd: number | null }[]).map((a) => ({
      kind: a.kind,
      provider: a.provider,
      costUsd: Number(a.cost_usd),
    })),
  );

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
          Spend log
        </h1>
        <p className="mt-1 text-sm text-muted">
          Every provider call and render cost, live — filter by project and
          sort by spend type.{" "}
          <Link
            href="/"
            className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-2"
          >
            Back to overview
          </Link>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={DollarSign}
          label="This month"
          value={`$${monthTotal.toFixed(2)}`}
        />
        <StatCard
          icon={DollarSign}
          label="Monthly budget"
          value={`$${monthlyBudget.toFixed(0)}`}
        />
        <StatCard
          icon={DollarSign}
          label="All-time spend"
          value={`$${allTimeTotal.toFixed(2)}`}
        />
      </div>

      <CostReconciliationPanel recon={recon} />

      <CostLog rows={rows} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
    </div>
  );
}

import { Clapperboard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";

/**
 * MVDA scoreboard (Phase E): the side-by-side that decides retirement (§8
 * success criteria). Sessions from the audit table; FINAL QC means split by
 * render path (EDD cut vs legacy derivation). Renders nothing until the
 * agent has run at least once.
 */

const WINDOW_DAYS = 30;

export async function MvdaScoreboard() {
  const supabase = await createClient();
  const since = new Date(Date.now() - WINDOW_DAYS * 864e5).toISOString();

  const { data: sessions } = await supabase
    .from("agent_sessions")
    .select("status, spend_usd, judge, model, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (sessions ?? []) as { status: string; spend_usd: number; judge: { score?: number } | null }[];
  if (rows.length === 0) return null;

  const ready = rows.filter((r) => r.status === "ready").length;
  const held = rows.filter((r) => r.status === "held").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const spend = rows.reduce((s, r) => s + Number(r.spend_usd ?? 0), 0);
  const judged = rows.map((r) => Number(r.judge?.score)).filter((n) => Number.isFinite(n) && n > 0);
  const avgJudge = judged.length ? judged.reduce((s, n) => s + n, 0) / judged.length : null;

  // Side-by-side FINAL QC: agent/EDD-rendered vs legacy-rendered videos.
  const { data: qc } = await supabase
    .from("qc_reviews")
    .select("video_id, score, created_at")
    .eq("gate", "FINAL")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(400);
  const qcRows = (qc ?? []) as { video_id: string; score: number }[];
  const latest = new Map<string, number>();
  for (const r of qcRows) if (!latest.has(r.video_id)) latest.set(r.video_id, Number(r.score));
  let eddAvg: number | null = null;
  let legacyAvg: number | null = null;
  let eddN = 0;
  let legacyN = 0;
  if (latest.size > 0) {
    const { data: vids } = await supabase
      .from("videos")
      .select("id, edit_document_version")
      .in("id", [...latest.keys()]);
    const edd: number[] = [];
    const legacy: number[] = [];
    for (const v of (vids ?? []) as { id: string; edit_document_version: number | null }[]) {
      const score = latest.get(v.id);
      if (score == null) continue;
      (v.edit_document_version != null ? edd : legacy).push(score);
    }
    eddN = edd.length;
    legacyN = legacy.length;
    eddAvg = edd.length ? edd.reduce((s, n) => s + n, 0) / edd.length : null;
    legacyAvg = legacy.length ? legacy.reduce((s, n) => s + n, 0) / legacy.length : null;
  }

  const fmt = (n: number | null) => (n == null ? "—" : n.toFixed(1));

  return (
    <Card>
      <CardTitle>
        <span className="flex items-center gap-2">
          <Clapperboard className="size-4" /> MVDA scoreboard — last {WINDOW_DAYS} days
        </span>
      </CardTitle>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Cut sessions" value={String(rows.length)} sub={`${ready} ready · ${held} held${failed ? ` · ${failed} failed` : ""}`} />
        <Stat label="Avg judge score" value={fmt(avgJudge)} sub="frame-critic, final cut" />
        <Stat label="Agent spend" value={`$${spend.toFixed(2)}`} sub={`~$${(spend / rows.length).toFixed(2)}/session`} />
        <Stat
          label="FINAL QC: cut vs legacy"
          value={`${fmt(eddAvg)} / ${fmt(legacyAvg)}`}
          sub={`n=${eddN} EDD · n=${legacyN} legacy`}
        />
      </div>
      <p className="mt-3 text-xs text-muted">
        Retirement bar (§8): Director ≥ Platinum on FINAL QC across ≥10 videos, no rise in
        Cut-gate revisions, cost/video ≤ +$1, zero settle violations.
      </p>
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-canvas px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

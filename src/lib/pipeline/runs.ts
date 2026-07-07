import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Unified runs read model (UI-Redesign v2 backlog): ONE engine-side seam
 * over the two autonomous-run tables. `operator_runs` (the calendar/cadence
 * system) and `build_runs` (one-off boosts) stay separate tables — their
 * write paths, budgets, and lifecycles genuinely differ — but every consumer
 * that *lists* runs (the Autopilot timeline, the Feed) reads THIS model, so
 * presentation can never fork again and a future physical merge (or the
 * Stage-3 org_id migration) only touches this file's queries.
 *
 * Deliberate non-goal: no destructive schema merge. See the v2 notes in
 * Fable-5-UI-Redesign.md — the single-tenant DB is live; the unified view
 * belongs at the accessor layer until multi-tenancy forces a migration pass
 * over both tables anyway.
 */

export type StudioRun = {
  id: string;
  projectId: string;
  source: "operator" | "boost";
  status: string;
  /** Videos attached to the run (boost) — null for operator cycles. */
  videoCount: number | null;
  createdAt: string;
  /** Human timeline line, e.g. "Boost run — 3 videos (publishing)". */
  label: string;
};

type Db = Awaited<ReturnType<typeof createClient>>;

export function boostRunLabel(count: number, status: string): string {
  return `Boost run — ${count} video${count === 1 ? "" : "s"} (${status})`;
}

export function operatorRunLabel(status: string): string {
  return `Autopilot cycle ${status}`;
}

export async function getStudioRuns(
  projectId: string,
  limit = 10,
  dbArg?: Db,
): Promise<StudioRun[]> {
  const db = dbArg ?? (await createClient());
  const [{ data: boosts }, { data: cycles }] = await Promise.all([
    db
      .from("build_runs")
      .select("id, status, count, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit),
    db
      .from("operator_runs")
      .select("id, status, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  type BoostRow = { id: string; status: string; count: number; created_at: string };
  type CycleRow = { id: string; status: string; created_at: string };

  const runs: StudioRun[] = [
    ...((boosts ?? []) as BoostRow[]).map((r) => ({
      id: r.id,
      projectId,
      source: "boost" as const,
      status: r.status,
      videoCount: Number(r.count ?? 0),
      createdAt: r.created_at,
      label: boostRunLabel(Number(r.count ?? 0), r.status),
    })),
    ...((cycles ?? []) as CycleRow[]).map((r) => ({
      id: r.id,
      projectId,
      source: "operator" as const,
      status: r.status,
      videoCount: null,
      createdAt: r.created_at,
      label: operatorRunLabel(r.status),
    })),
  ];
  return runs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit);
}

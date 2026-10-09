import "server-only";
import { randomUUID } from "node:crypto";
import {
  compareTraction,
  parseFormat,
  persuasionGaps,
  sectionPlan,
  type FormatBeat,
  type FormatRecord,
  type FormatStats,
} from "@studio/core";
import type { createAdminClient } from "@/lib/supabase/admin";

type Db = ReturnType<typeof createAdminClient>;

export type FormatRow = {
  id: string;
  project_id: string | null;
  niche: string;
  platform: string;
  source_url: string;
  source_key: string;
  source: string;
  creator: string | null;
  posted_at: string | null;
  stats: FormatStats;
  title: string | null;
  hook: string | null;
  beat_map: FormatBeat[];
  product_moment: string | null;
  why_it_works: string | null;
  duration_sec: number | null;
  tags: string[];
  status: string;
  used_count: number;
  last_used_at: string | null;
  notes: string | null;
  created_at: string;
};

function toRow(f: FormatRecord, projectId?: string | null) {
  return {
    ...(projectId ? { project_id: projectId } : {}),
    niche: f.niche,
    platform: f.platform,
    source_url: f.sourceUrl,
    source_key: f.sourceKey,
    source: f.source,
    creator: f.creator ?? null,
    posted_at: f.postedAt ?? null,
    stats: f.stats,
    title: f.title ?? null,
    hook: f.hook ?? null,
    beat_map: f.beatMap,
    product_moment: f.productMoment ?? null,
    why_it_works: f.whyItWorks ?? null,
    duration_sec: f.durationSec ?? null,
    tags: f.tags,
    status: f.status,
    notes: f.notes ?? null,
  };
}

/**
 * Save a format. The same video (same normalized link) updates its existing
 * row instead of duplicating it: fields given now win, fields left out keep
 * their stored value, stats merge, tags union.
 */
export async function recordFormat(
  db: Db,
  raw: unknown,
  opts: { projectId?: string | null } = {},
): Promise<{ ok: true; id: string; created: boolean } | { ok: false; errors: string[] }> {
  // Approval is checked against the MERGED row below (an update may approve a
  // format whose hook was recorded earlier), so parse it as a candidate.
  const approving = Boolean(raw) && typeof raw === "object" && (raw as Record<string, unknown>).status === "approved";
  const parsed = parseFormat(approving ? { ...(raw as Record<string, unknown>), status: "candidate" } : raw);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  const f: FormatRecord = approving ? { ...parsed.format, status: "approved" } : parsed.format;
  const { data: existing } = await db.from("formats").select("*").eq("source_key", f.sourceKey).maybeSingle();
  if (!existing) {
    if (approving) {
      const gaps = persuasionGaps(f);
      if (gaps.length) return { ok: false, errors: gaps };
    }
    const id = randomUUID();
    const { error } = await db.from("formats").insert({ id, ...toRow(f, opts.projectId) });
    if (error) return { ok: false, errors: [error.message] };
    return { ok: true, id, created: true };
  }
  const prev = existing as FormatRow;
  const given = (raw ?? {}) as Record<string, unknown>;
  const row = toRow(f);
  const merged: Record<string, unknown> = { updated_at: new Date().toISOString() };
  // Only overwrite what the caller actually supplied.
  const fieldOf: Record<string, string> = {
    niche: "niche", platform: "platform", sourceUrl: "source_url", source: "source", creator: "creator",
    postedAt: "posted_at", title: "title", hook: "hook", beatMap: "beat_map", productMoment: "product_moment",
    whyItWorks: "why_it_works", durationSec: "duration_sec", status: "status", notes: "notes",
  };
  for (const [k, col] of Object.entries(fieldOf)) if (given[k] !== undefined) merged[col] = row[col as keyof typeof row];
  if (given.stats !== undefined) merged.stats = { ...(prev.stats ?? {}), ...f.stats };
  if (given.tags !== undefined) merged.tags = [...new Set([...(prev.tags ?? []), ...f.tags])];
  if (opts.projectId && !prev.project_id) merged.project_id = opts.projectId;
  const status = (merged.status as string | undefined) ?? prev.status;
  if (status === "approved") {
    const gaps = persuasionGaps({
      hook: (merged.hook as string | null | undefined) ?? prev.hook ?? undefined,
      beatMap: (merged.beat_map as FormatBeat[] | undefined) ?? prev.beat_map ?? [],
      whyItWorks: (merged.why_it_works as string | null | undefined) ?? prev.why_it_works ?? undefined,
    });
    if (gaps.length) return { ok: false, errors: gaps };
  }
  const { error } = await db.from("formats").update(merged).eq("id", prev.id);
  if (error) return { ok: false, errors: [error.message] };
  return { ok: true, id: prev.id, created: false };
}

/** Formats, best traction first (plays and shares, then comments). */
export async function listFormats(
  db: Db,
  opts: { projectId?: string; niche?: string; platform?: string; status?: string; tag?: string; limit?: number } = {},
): Promise<FormatRow[]> {
  let q = db.from("formats").select("*").order("created_at", { ascending: false }).limit(500);
  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  if (opts.niche) q = q.ilike("niche", `%${opts.niche}%`);
  if (opts.platform) q = q.eq("platform", opts.platform);
  if (opts.status) q = q.eq("status", opts.status);
  else q = q.neq("status", "retired");
  if (opts.tag) q = q.contains("tags", [opts.tag.toLowerCase()]);
  const { data } = await q;
  return ((data ?? []) as FormatRow[])
    .sort((a, b) => compareTraction(a.stats ?? {}, b.stats ?? {}))
    .slice(0, Math.min(Math.max(opts.limit ?? 25, 1), 100));
}

/** One format plus a suggested section plan for writing a directed script. */
export async function getFormat(
  db: Db,
  id: string,
  maxSectionSec = 15,
): Promise<{ ok: true; format: FormatRow; sectionPlan: ReturnType<typeof sectionPlan> } | { ok: false; error: string }> {
  const { data } = await db.from("formats").select("*").eq("id", id).maybeSingle();
  if (!data) return { ok: false, error: "format not found" };
  const f = data as FormatRow;
  return {
    ok: true,
    format: f,
    sectionPlan: sectionPlan({ beatMap: f.beat_map ?? [], durationSec: f.duration_sec ?? undefined }, maxSectionSec),
  };
}

/** Count a use when a video is imported from a format. */
export async function markFormatUsed(db: Db, id: string): Promise<void> {
  const { data } = await db.from("formats").select("used_count").eq("id", id).maybeSingle();
  if (!data) return;
  await db
    .from("formats")
    .update({ used_count: ((data as { used_count: number }).used_count ?? 0) + 1, last_used_at: new Date().toISOString() })
    .eq("id", id);
}

/** Edit a stored format by id (status, persuasion fields, notes, tags, stats). */
export async function updateFormat(
  db: Db,
  id: string,
  patch: Record<string, unknown>,
): Promise<{ ok: true; id: string } | { ok: false; errors: string[] }> {
  const { data } = await db.from("formats").select("source_url").eq("id", id).maybeSingle();
  if (!data) return { ok: false, errors: ["format not found"] };
  const { sourceUrl: _ignored, ...rest } = patch;
  const r = await recordFormat(db, { ...rest, sourceUrl: (data as { source_url: string }).source_url });
  return r.ok ? { ok: true, id: r.id } : r;
}

/**
 * Canonical stage artifacts + checkpoint vocabulary (OpenMontage Remixed
 * list2-#1, #3, #4, C10; list1-#26).
 *
 * Every pipeline stage emits ONE canonical JSON artifact, validated against a
 * schema, so the contract between stages is explicit and a break is caught
 * before it propagates: brief → script → scene_plan → asset_manifest →
 * edit_decisions → render_report. (The app already validates script/EDD; this
 * formalises the same discipline for the upstream/downstream artifacts.)
 *
 * Alongside the artifacts, one STATUS VOCABULARY every stage reports against,
 * plus a `partial_progress` shape so a multi-asset stage ("18 of 30 stills")
 * is persisted and a crashed run resumes mid-stage instead of restarting.
 *
 * Pure — no I/O — so validation + the resume math are deterministic and unit-
 * tested; the app/worker persist the artifacts and progress.
 */

// ── The canonical stages, in order ────────────────────────────────────────
export const STAGE_ARTIFACTS = [
  "brief",
  "script",
  "scene_plan",
  "asset_manifest",
  "edit_decisions",
  "render_report",
] as const;
export type StageArtifactKind = (typeof STAGE_ARTIFACTS)[number];

// ── Checkpoint status vocabulary (list2-#4 / C10) ─────────────────────────
export const CHECKPOINT_STATUSES = [
  "in_progress",
  "completed",
  "awaiting_human",
  "failed",
] as const;
export type CheckpointStatus = (typeof CHECKPOINT_STATUSES)[number];

export function isCheckpointStatus(s: string): s is CheckpointStatus {
  return (CHECKPOINT_STATUSES as readonly string[]).includes(s);
}

/** Fine-grained progress inside a multi-asset stage — persisted so a crashed
    stage resumes at `done`, not from zero (C10). */
export type PartialProgress = {
  stage: StageArtifactKind | string;
  status: CheckpointStatus;
  /** Units finished (e.g. stills rendered). */
  done: number;
  /** Total units in this stage (e.g. beats needing a clip). */
  total: number;
  label?: string;
  updatedAt?: string;
};

/** A human/board-ready one-liner, e.g. "18 of 30 stills". Pure. */
export function progressLabel(p: Pick<PartialProgress, "done" | "total" | "label">): string {
  const noun = p.label ?? "items";
  const total = Math.max(0, p.total);
  const done = Math.max(0, Math.min(p.done, total));
  return total > 0 ? `${done} of ${total} ${noun}` : `${done} ${noun}`;
}

/** Fraction complete (0..1), clamped. Pure — powers the resumable progress. */
export function progressFraction(p: Pick<PartialProgress, "done" | "total">): number {
  if (!p.total || p.total <= 0) return 0;
  return Math.max(0, Math.min(1, p.done / p.total));
}

/** The remaining unit indices to (re)generate — the resume set for a stage
    that persisted `done` of `total` before crashing. Pure. */
export function remainingUnits(done: number, total: number): number[] {
  const out: number[] = [];
  for (let i = Math.max(0, done); i < Math.max(0, total); i++) out.push(i);
  return out;
}

// ── Schema validation (list2-#1) ──────────────────────────────────────────

export type ArtifactValidation = { ok: boolean; errors: string[] };

type FieldSpec = { key: string; type: "string" | "number" | "array" | "object" | "boolean"; min?: number };

/** Minimal required-field schemas for the artifacts the app doesn't already
    validate structurally (script + EDD have their own validators). Deliberately
    light — presence + type + non-empty — to catch a broken/empty artifact
    without coupling to every optional field. */
const SCHEMAS: Partial<Record<StageArtifactKind, FieldSpec[]>> = {
  brief: [
    { key: "topic", type: "string" },
    { key: "angle", type: "string" },
    { key: "audience", type: "string" },
  ],
  scene_plan: [{ key: "beats", type: "array", min: 1 }],
  asset_manifest: [{ key: "assets", type: "array", min: 1 }],
  render_report: [
    { key: "durationSec", type: "number" },
    { key: "variant", type: "string" },
  ],
};

function typeOf(v: unknown): string {
  if (Array.isArray(v)) return "array";
  return typeof v;
}

/**
 * Validate a stage artifact against its canonical schema. Kinds without a
 * declared schema here (script/edit_decisions — validated elsewhere) pass with
 * a note. Never throws.
 */
export function validateStageArtifact(kind: StageArtifactKind, data: unknown): ArtifactValidation {
  const spec = SCHEMAS[kind];
  if (!spec) return { ok: true, errors: [] };
  if (data == null || typeof data !== "object") {
    return { ok: false, errors: [`${kind}: artifact is missing or not an object`] };
  }
  const obj = data as Record<string, unknown>;
  const errors: string[] = [];
  for (const f of spec) {
    const v = obj[f.key];
    if (v == null) {
      errors.push(`${kind}.${f.key} is required`);
      continue;
    }
    const t = typeOf(v);
    if (t !== f.type) {
      errors.push(`${kind}.${f.key} must be ${f.type} (got ${t})`);
      continue;
    }
    if (f.type === "string" && (v as string).trim() === "") errors.push(`${kind}.${f.key} must not be empty`);
    if (f.type === "array" && f.min != null && (v as unknown[]).length < f.min) {
      errors.push(`${kind}.${f.key} must have at least ${f.min} item(s)`);
    }
    if (f.type === "number" && !Number.isFinite(v as number)) errors.push(`${kind}.${f.key} must be a finite number`);
  }
  return { ok: errors.length === 0, errors };
}

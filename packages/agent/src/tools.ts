import { z } from "zod";
import {
  addAudioCue,
  assembleCompileInput,
  autoEmphasis,
  compileEdd,
  cutBeatsToSegment,
  insertEddVersion,
  introOutroRuntime,
  lintEdd,
  craftCritique,
  lintSummary,
  retimeClip,
  setTrim,
  setTransition,
  setMotion,
  setClipSpeed,
  splitClip,
  addMotionKeyframe,
  setTokenEmphasis,
  setPageStyle,
  setClipSilent,
  swapClipAsset,
  sourceForClipMeta,
  selectGroundingFrames,
  validateAgainst,
  type EddDb,
  type EditDocument,
  type MotionSpec,
  type Transition,
} from "@studio/core";
import { gateTool, type SessionState } from "./session-state";

/**
 * The MVDA tool surface (plan §4, C1): bounded verbs over the SAME pure
 * edd-ops the /edit inspector uses. Every mutation validates with the
 * production validateEdd and appends a version (author 'agent',
 * requireParentHead — A9). Handlers are plain async functions so the
 * self-test can drive them without the LLM; agent-queue wraps them into
 * an in-process MCP server for the SDK session.
 */

type Db = { from(table: string): any }; // supabase-js client (worker service role)

export type SessionCtx = {
  db: Db;
  state: SessionState;
  video: { id: string; kind: string; title: string; project_id: string };
  scriptId: string;
  beats: { idx: number; text: string; motion?: string }[];
  assets: {
    id: string; kind: string; beat_index: number | null; provider: string;
    storage_path: string | null; meta: Record<string, unknown> | null;
  }[];
  headVersion: number;
  doc: EditDocument;
  /** Injected renderers so the self-test can stub them (agent-queue wires
      real Remotion + the footage frame-critic). */
  renderPreview: (doc: EditDocument, range?: { fromSec?: number; toSec?: number }) => Promise<{ path: string }>;
  judgeDoc: (doc: EditDocument) => Promise<{ score: number; issues: string[]; costUsd: number }>;
  /** Visual grounding (§C.1): render still JPEGs at the given clip midpoints so
      the agent can SEE the cut. Optional — absent in the self-test (which falls
      back to a text-only timeline). Wired to Remotion in agent-queue. */
  sampleFrames?: (doc: EditDocument, picks: { clipId: string; atSec: number }[]) => Promise<{ clipId: string; jpegBase64: string }[]>;
  onReady?: (note: string) => Promise<void>;
};

const num = (v: number) => Math.round(v * 100) / 100;

/** Validate + append the working doc as a new agent version. */
async function persist(ctx: SessionCtx, doc: EditDocument, note: string): Promise<string> {
  const verdict = validateAgainst(doc, ctx.assets, ctx.beats);
  if (!verdict.ok) {
    return `REJECTED (document invalid): ${verdict.errors.slice(0, 3).map((e) => `${e.rule}: ${e.msg}`).join("; ")}`;
  }
  const inserted = await insertEddVersion(ctx.db as unknown as EddDb, {
    videoId: ctx.video.id,
    scriptId: ctx.scriptId,
    doc,
    author: "agent",
    note,
    parentVersion: ctx.headVersion,
    requireParentHead: true,
  });
  if (!inserted.ok) return `REJECTED: ${inserted.error}`;
  ctx.doc = doc;
  ctx.headVersion = inserted.version;
  ctx.state.versions += 1;
  ctx.state.judgeScore = null; // a new cut must be re-judged before mark_ready
  return `ok — saved v${inserted.version} (runtime ${num(introOutroRuntime(doc))}s)`;
}

/** Compile the faithful v1 when the video has no document yet. */
export async function ensureCompiled(ctx: SessionCtx): Promise<string> {
  if (ctx.headVersion > 0) return `head is v${ctx.headVersion}`;
  const input = assembleCompileInput({
    kind: ctx.video.kind,
    scriptBeats: ctx.beats,
    assets: ctx.assets,
    curatedHighlights: [],
    captionsEnabled: true,
  });
  const doc = compileEdd(input);
  const verdict = validateAgainst(doc, ctx.assets, ctx.beats);
  if (!verdict.ok) throw new Error(`compiled v1 invalid: ${verdict.errors[0]?.rule}`);
  const inserted = await insertEddVersion(ctx.db as unknown as EddDb, {
    videoId: ctx.video.id,
    scriptId: ctx.scriptId,
    doc,
    author: "compiler",
    note: "Compiled from legacy beats + assets (agent session bootstrap)",
    parentVersion: null,
  });
  if (!inserted.ok) throw new Error(inserted.error);
  ctx.doc = doc;
  ctx.headVersion = inserted.version;
  return `compiled v${inserted.version}`;
}

const motionSchema = z.union([
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("kenburns"), fromScale: z.number(), toScale: z.number(), anchor: z.enum(["center", "top", "bottom", "left", "right"]) }),
  z.object({ kind: z.literal("heroHold"), rate: z.number().min(0.1).max(1) }),
  z.object({
    kind: z.literal("keyframes"),
    points: z.array(z.object({ t: z.number(), scale: z.number(), x: z.number(), y: z.number(), ease: z.enum(["linear", "easeIn", "easeOut", "easeInOut"]) })).min(2),
  }),
]);
const transitionSchema = z.object({
  kind: z.enum(["cut", "crossfade", "dissolve", "slide", "whip", "dipToBlack", "zoomBlur"]),
  sec: z.number().min(0).max(2).optional(),
  dir: z.enum(["left", "right", "up", "down"]).optional(),
});

/** A tool result block. Backward-compatible: `run` may return a plain string
    (wrapped as a single text block, exactly as before) OR content blocks so a
    read tool can return images (visual grounding, §C.1). */
export type ToolContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };
export type ToolDef = { description: string; schema: z.ZodTypeAny; run: (args: any) => Promise<string | ToolContent[]> };

export function makeTools(ctx: SessionCtx): Record<string, ToolDef> {
  return {
    get_context: {
      description: "The video's brief, beats, asset inventory, and session state — read this first.",
      schema: z.object({}),
      run: async () => {
        const clips = ctx.assets.filter((a) => a.kind === "clip").map((a) => ({
          id: a.id, beat: a.beat_index,
          source: sourceForClipMeta(a.meta as never, a.provider),
          durationSec: (a.meta as { durationSec?: number } | null)?.durationSec,
        }));
        return JSON.stringify({
          title: ctx.video.title,
          kind: ctx.video.kind,
          beats: ctx.beats,
          clipAssets: clips,
          headVersion: ctx.headVersion,
          runtimeSec: num(introOutroRuntime(ctx.doc)),
          budget: { max: ctx.state.maxBudgetUsd, spent: num(ctx.state.spentUsd) },
          judge: ctx.state.judgeScore,
          cutFloor: ctx.state.floor,
          lint: lintSummary(lintEdd(ctx.doc)),
          craft: craftCritique(ctx.doc).slice(0, 6).map((c) => `${c.rule}: ${c.msg} → ${c.suggestion}`),
        });
      },
    },
    get_edd: {
      description: "The current head Edit Decision Document (full JSON).",
      schema: z.object({}),
      run: async () => JSON.stringify(ctx.doc),
    },
    timeline_view: {
      description:
        "SEE the actual cut: renders still frames at key beats (bookends + transition/decision points) so you can judge framing, motion, b-roll relevance, and caption legibility with your eyes — not just the JSON. Read-only. Call before big pacing/transition/swap decisions and after a round of edits.",
      schema: z.object({ maxFrames: z.number().min(1).max(8).default(6) }),
      run: async (a): Promise<string | ToolContent[]> => {
        ctx.state.views += 1;
        const picks = selectGroundingFrames(
          ctx.doc.tracks.video.map((c) => ({ id: c.id, beatIdx: c.beatIdx, start: c.start, duration: c.duration, transitionOut: c.transitionOut })),
          a.maxFrames,
        );
        if (picks.length === 0) return "timeline is empty (no video clips yet)";
        // Self-test / no renderer wired → text-only timeline (graceful).
        if (!ctx.sampleFrames) {
          return `timeline (${picks.length} key beats): ${picks.map((p) => `beat ${p.beatIdx} @${p.atSec}s`).join(", ")}`;
        }
        const frames = await ctx.sampleFrames(ctx.doc, picks.map((p) => ({ clipId: p.clipId, atSec: p.atSec })));
        // Breadcrumb: the image tool-result path only runs in the real agent
        // worker (never in unit tests), so this stderr line is how a run log
        // proves timeline_view fired and returned images (§C.1 verification).
        console.error(`🖼  timeline_view #${ctx.state.views}: rendered ${frames.length}/${picks.length} frames as image blocks`);
        const content: ToolContent[] = [
          { type: "text", text: `Rendered ${frames.length} frames at key beats. Judge framing, motion, b-roll relevance, and caption legibility; each frame is labeled with its beat.` },
        ];
        for (const p of picks) {
          const f = frames.find((x) => x.clipId === p.clipId);
          if (!f) continue;
          content.push({ type: "text", text: `beat ${p.beatIdx} @ ${p.atSec}s (clip ${p.clipId}):` });
          content.push({ type: "image", data: f.jpegBase64, mimeType: "image/jpeg" });
        }
        return content.length > 1 ? content : "timeline_view: no frames could be rendered this pass";
      },
    },
    retime_clip: {
      description: "Set a clip's duration (seconds ≥1); later clips reflow gapless.",
      schema: z.object({ clipId: z.string(), durationSec: z.number().min(1), note: z.string().default("") }),
      run: (a) => persist(ctx, retimeClip(ctx.doc, a.clipId, a.durationSec), a.note || `retime ${a.clipId} → ${a.durationSec}s`),
    },
    split_clip: {
      description:
        "Split a clip into two halves at a LOCAL offset (seconds from the clip's start). Both halves keep the beat so narration stays covered; a hard cut joins them and the outgoing transition moves to the tail. The one structural edit available — use it to break a long, monotonous shot, then re-motion / re-transition / swap_visual one half for variety (the rubric's 'split the longest clips').",
      schema: z.object({ clipId: z.string(), atSec: z.number().min(0.2), note: z.string().default("") }),
      run: (a) => persist(ctx, splitClip(ctx.doc, a.clipId, a.atSec), a.note || `split ${a.clipId} @${a.atSec}s`),
    },
    trim_clip: {
      description: "Set a clip's source trim window {in,out} (video sources loop the window).",
      schema: z.object({ clipId: z.string(), in: z.number().min(0), out: z.number().min(0), note: z.string().default("") }),
      run: (a) => persist(ctx, setTrim(ctx.doc, a.clipId, a.in, a.out), a.note || `trim ${a.clipId}`),
    },
    set_transition: {
      description: "Set a clip's outgoing transition (registry kinds; sec clamped to fit).",
      schema: z.object({ clipId: z.string(), transition: transitionSchema, note: z.string().default("") }),
      run: (a) => persist(ctx, setTransition(ctx.doc, a.clipId, a.transition as Transition), a.note || `transition ${a.clipId} → ${a.transition.kind}`),
    },
    set_motion: {
      description: "Set a clip's camera motion (none/kenburns/heroHold/keyframes; x/y are % of frame).",
      schema: z.object({ clipId: z.string(), motion: motionSchema, note: z.string().default("") }),
      run: (a) => persist(ctx, setMotion(ctx.doc, a.clipId, a.motion as MotionSpec), a.note || `motion ${a.clipId} → ${a.motion.kind}`),
    },
    set_speed: {
      description: "Set a footage clip's playback speed / ramp (0.25–4×; 1 = normal). No effect on stills.",
      schema: z.object({ clipId: z.string(), speed: z.number().min(0.25).max(4), note: z.string().default("") }),
      run: (a) => persist(ctx, setClipSpeed(ctx.doc, a.clipId, a.speed), a.note || `speed ${a.clipId} → ${a.speed}×`),
    },
    add_keyframe: {
      description: "Add a motion keyframe to a clip (converts it to a keyframe track; x/y are % of frame).",
      schema: z.object({
        clipId: z.string(),
        point: z.object({ t: z.number().min(0), scale: z.number().min(0.1), x: z.number(), y: z.number(), ease: z.enum(["linear", "easeIn", "easeOut", "easeInOut"]).default("easeInOut") }),
        note: z.string().default(""),
      }),
      run: (a) => persist(ctx, addMotionKeyframe(ctx.doc, a.clipId, a.point), a.note || `keyframe ${a.clipId} @${a.point.t}s`),
    },
    set_emphasis: {
      description: "Set a caption token's kinetic emphasis (none|pop|color|shake|scale).",
      schema: z.object({ pageIdx: z.number().int().min(0), tokenIdx: z.number().int().min(0), emphasis: z.enum(["none", "pop", "color", "shake", "scale"]) }),
      run: (a) => persist(ctx, setTokenEmphasis(ctx.doc, a.pageIdx, a.tokenIdx, a.emphasis), `emphasis p${a.pageIdx}t${a.tokenIdx} → ${a.emphasis}`),
    },
    set_caption_style: {
      description: "Set a caption page's style/position.",
      schema: z.object({ pageIdx: z.number().int().min(0), style: z.string().optional(), position: z.enum(["bottom", "center", "top"]).optional() }),
      run: (a) => persist(ctx, setPageStyle(ctx.doc, a.pageIdx, { style: a.style, position: a.position }), `caption page ${a.pageIdx} style`),
    },
    set_silent: {
      description: "Flag a clip as an intentional narration pause (mutes its VO reversibly).",
      schema: z.object({ clipId: z.string(), silent: z.boolean() }),
      run: (a) => persist(ctx, setClipSilent(ctx.doc, a.clipId, a.silent), `${a.silent ? "mute" : "unmute"} ${a.clipId}`),
    },
    swap_visual: {
      description: "Swap a clip's visual to another EXISTING live clip asset (no new spend).",
      schema: z.object({ clipId: z.string(), assetId: z.string(), note: z.string().default("") }),
      run: async (a) => {
        const asset = ctx.assets.find((x) => x.id === a.assetId && x.kind === "clip");
        if (!asset) return `REJECTED: asset ${a.assetId} is not a live clip asset`;
        const doc = swapClipAsset(ctx.doc, a.clipId, {
          id: asset.id,
          source: sourceForClipMeta(asset.meta as never, asset.provider),
          durationSec: (asset.meta as { durationSec?: number } | null)?.durationSec,
        });
        return persist(ctx, doc, a.note || `swap ${a.clipId} → ${a.assetId.slice(0, 8)}`);
      },
    },
    auto_emphasis: {
      description:
        "One-shot deterministic emphasis pass: numbers pop, money/percent scale, power words color — sparse (≤1 per page), skips pages already emphasized (Phase D).",
      schema: z.object({ maxTotal: z.number().int().min(1).max(20).default(10) }),
      run: async (a) => {
        const { doc, picks } = autoEmphasis(ctx.doc, { maxTotal: a.maxTotal });
        if (picks.length === 0) return "no emphasis-worthy tokens found (or pages already authored)";
        return persist(ctx, doc, `auto emphasis (${picks.length} tokens)`);
      },
    },
    add_sfx: {
      description:
        "Place a generated SFX cue (existing kind='sfx' asset) at an absolute second or anchored to a caption word of a clip (survives retiming).",
      schema: z.object({
        assetId: z.string(),
        atSec: z.number().min(0).optional(),
        wordAnchor: z.object({ clipId: z.string(), captionToken: z.number().int().min(0) }).optional(),
        gainDb: z.number().min(-24).max(6).default(-6),
        note: z.string().default(""),
      }),
      run: async (a) => {
        const asset = ctx.assets.find((x) => x.id === a.assetId && x.kind === "sfx");
        if (!asset) return `REJECTED: asset ${a.assetId} is not a generated sfx asset`;
        if (a.atSec == null && !a.wordAnchor) return "REJECTED: provide atSec or wordAnchor";
        const doc = addAudioCue(ctx.doc, {
          kind: "sfx",
          ref: { source: "generated", assetId: asset.id },
          at: a.wordAnchor
            ? { kind: "word", clipId: a.wordAnchor.clipId, captionToken: a.wordAnchor.captionToken }
            : { kind: "abs", sec: a.atSec as number },
          gainDb: a.gainDb,
        });
        return persist(ctx, doc, a.note || `sfx ${asset.id.slice(0, 8)}`);
      },
    },
    render_preview: {
      description: "Render a half-res true-fidelity preview of the current cut (costs render time; ≤3/session).",
      schema: z.object({ fromSec: z.number().min(0).optional(), toSec: z.number().min(0).optional() }),
      run: async (a) => {
        const out = await ctx.renderPreview(ctx.doc, a);
        ctx.state.previews += 1;
        return `preview rendered: ${out.path}`;
      },
    },
    judge_preview: {
      description: "Score the CURRENT cut with the vision judge (required before mark_ready; ≤3/session).",
      schema: z.object({}),
      run: async () => {
        const verdict = await ctx.judgeDoc(ctx.doc);
        ctx.state.judges += 1;
        ctx.state.spentUsd += verdict.costUsd;
        ctx.state.judgeScore = verdict.score;
        await ctx.db.from("edit_documents").update({ judge: verdict }).eq("video_id", ctx.video.id).eq("version", ctx.headVersion);
        return JSON.stringify({ score: verdict.score, floor: ctx.state.floor, issues: verdict.issues.slice(0, 6) });
      },
    },
    mark_ready: {
      description: "Finish: activate the current cut and arrive at the CUT gate (denied below the judge floor).",
      schema: z.object({ note: z.string().default("") }),
      run: async (a) => {
        await ctx.db.from("videos").update({ edit_document_version: ctx.headVersion }).eq("id", ctx.video.id);
        await ctx.db.from("edit_documents").update({ status: "previewed" }).eq("video_id", ctx.video.id).eq("version", ctx.headVersion);
        await ctx.onReady?.(a.note);
        return `ready — v${ctx.headVersion} is the active cut at the CUT gate`;
      },
    },
    write_lesson: {
      description: "Append one concise editing lesson learned this session (≤3/session).",
      schema: z.object({ text: z.string().min(10).max(500) }),
      run: async (a) => {
        await ctx.db.from("memory_entries").insert({
          project_id: ctx.video.project_id,
          namespace: "editing",
          tier: "channel",
          kind: "lesson",
          status: "shadow",
          text: a.text,
          evidence: `mvda session on video ${ctx.video.id} (v${ctx.headVersion})`,
          meta: { source: "mvda-session", videoId: ctx.video.id },
        });
        ctx.state.lessons += 1;
        return "lesson recorded (shadow)";
      },
    },
  };
}

export { gateTool, cutBeatsToSegment };

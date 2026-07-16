import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GATE_FOR_STATUS, sourceForClipMeta, type EditDocument } from "@studio/core";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProject } from "@/lib/db/queries";
import { getSignedMediaUrl } from "@/lib/storage";
import { compileEddFromLegacy, cutBeatsToSegment } from "@/lib/pipeline/edd-service";
import { getEditorFlags } from "@/lib/pipeline/editor-flags";
import { buildPlayerMaps } from "@/lib/edd-player-data";
import { diffSummary } from "@/lib/edd-editor";
import type { Asset, ScriptBeat, ShortSegment, Video } from "@/lib/db/types";
import { Card } from "@/components/ui/card";
import { EddEditor, type EditorAssetOption, type EditorVersion } from "./editor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * /edit — the Cut-gate timeline editor (MVDA Phase B, plan §5 + Decision 4).
 * A dedicated full-height surface over the video's Edit Decision Document:
 * Remotion <Player> preview + track lanes + inspector + version history.
 * Human and (later) agent are peers on the same document — a save here is
 * just a new version row.
 */
export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string; vid: string }>;
}) {
  const { id, vid } = await params;
  const supabase = await createClient();
  const [project, { data: video }] = await Promise.all([
    getProject(id),
    supabase.from("videos").select("*").eq("id", vid).maybeSingle(),
  ]);
  if (!project || !video) notFound();
  const v = video as Video & { edit_document_version: number | null };

  // Derived shorts edit against the parent's script + assets (same sourceId
  // convention as the render farm and the compiler).
  const isDerived = v.kind === "short" && v.parent_video_id;
  const sourceId = isDerived ? (v.parent_video_id as string) : vid;
  const [{ data: script }, { data: assets }] = await Promise.all([
    supabase
      .from("scripts")
      .select("id, beats")
      .eq("video_id", sourceId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("assets").select("*").eq("video_id", sourceId).order("beat_index", { ascending: true }),
  ]);

  if (!script || !assets) {
    return (
      <MissingCard projectId={id} videoId={vid} reason="This video has no script or assets yet — the editor opens once assets exist." />
    );
  }

  let beats = (script.beats ?? []) as ScriptBeat[];
  if (isDerived) {
    beats = cutBeatsToSegment(beats, (v.source_segment ?? null) as ShortSegment | null);
  }

  // First visit: compile the faithful v1 so there is a real document to edit.
  // NOTE: on the compile path we construct the row from the compiler's return
  // instead of re-running the identical select — React memoizes same-URL GET
  // fetches within one render, so a refetch would be served the FIRST (empty)
  // response and 404 the page.
  const admin = createAdminClient();
  const { data: versionRows } = await admin
    .from("edit_documents")
    .select("version, parent_version, author, status, inputs_stale, note, created_at, doc")
    .eq("video_id", vid)
    .order("version", { ascending: false })
    .limit(20);
  let rows = versionRows ?? [];
  if (rows.length === 0) {
    const compiled = await compileEddFromLegacy(vid);
    if (!compiled.ok) {
      return (
        <MissingCard
          projectId={id}
          videoId={vid}
          reason={`The compiler could not build an editable cut: ${compiled.error}`}
        />
      );
    }
    rows = [
      {
        version: compiled.version,
        parent_version: null,
        author: "compiler",
        status: "draft",
        inputs_stale: false,
        note: "Compiled from legacy beats + assets (faithful v1)",
        created_at: new Date().toISOString(),
        doc: compiled.doc,
      },
    ];
  }
  if (rows.length === 0) notFound();

  const head = rows[0];
  const headDoc = head.doc as EditDocument;
  const versions: EditorVersion[] = rows.map((r, i) => ({
    version: r.version as number,
    author: r.author as string,
    status: r.status as string,
    note: r.note as string,
    createdAt: r.created_at as string,
    inputsStale: Boolean(r.inputs_stale),
    active: v.edit_document_version === r.version,
    summary:
      i + 1 < rows.length
        ? diffSummary(rows[i + 1].doc as EditDocument, r.doc as EditDocument).slice(0, 3)
        : ["compiled from the legacy cut"],
  }));

  const assetRows = assets as Asset[];
  const maps = await buildPlayerMaps(assetRows, beats);

  // Generated SFX assets (Phase D, D7) — placement options for the inspector.
  const sfxOptions = assetRows
    .filter((a) => (a.kind as string) === "sfx")
    .map((a) => {
      const meta = a.meta as { prompt?: string; durationSec?: number } | null;
      return {
        id: a.id,
        label: (meta?.prompt ?? "sound effect").slice(0, 60),
        durationSec: meta?.durationSec,
      };
    });

  // Swap-picker options: every live clip asset, with a preview URL.
  const clipOptions: EditorAssetOption[] = await Promise.all(
    assetRows
      .filter((a) => a.kind === "clip")
      .map(async (a) => {
        const meta = a.meta as {
          url?: string;
          posterUrl?: string;
          isVideo?: boolean;
          durationSec?: number;
          stickScene?: unknown;
          dataViz?: unknown;
        };
        const source = sourceForClipMeta(meta, a.provider);
        return {
          id: a.id,
          beatIdx: a.beat_index ?? -1,
          provider: a.provider,
          isVideo: source === "stock" || source === "ai-clip",
          durationSec: meta.durationSec,
          previewUrl:
            meta.posterUrl ?? meta.url ?? (await getSignedMediaUrl(a.storage_path, 7200)),
          source,
        };
      }),
  );

  // Latest true-fidelity previews rendered by the farm.
  const { data: previewAssets } = await admin
    .from("assets")
    .select("storage_path, meta, created_at")
    .eq("video_id", vid)
    .eq("kind", "preview")
    .order("created_at", { ascending: false })
    .limit(2);
  const previews = await Promise.all(
    (previewAssets ?? []).map(async (p) => ({
      url: await getSignedMediaUrl(p.storage_path as string, 7200),
      meta: (p.meta ?? {}) as { eddVersion?: number; fromSec?: number; toSec?: number },
      createdAt: p.created_at as string,
    })),
  );

  const gate = GATE_FOR_STATUS[v.status];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/projects/${id}/videos/${vid}`}
          className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" /> {v.title}
        </Link>
      </div>
      <EddEditor
        // Remount when the head changes (save/revert + router.refresh): the
        // editor's local doc state must re-seed from the new head, or a
        // revert would leave the stale pre-revert doc on screen.
        key={rows[0].version as number}
        projectId={id}
        videoId={vid}
        title={v.title}
        projectName={project.name}
        brand={{
          primary: (project.brand_kit as { primary?: string } | null)?.primary ?? "#F5B829",
          secondary: (project.brand_kit as { secondary?: string } | null)?.secondary ?? "#17150F",
        }}
        initialDoc={headDoc}
        headVersion={head.version as number}
        activeVersion={v.edit_document_version}
        versions={versions}
        maps={maps}
        clipOptions={clipOptions}
        beats={beats.map((b) => ({ idx: b.idx, text: b.text }))}
        ctxAssets={assetRows.map((a) => ({
          id: a.id,
          kind: a.kind,
          durationSec: (a.meta as { durationSec?: number } | null)?.durationSec,
        }))}
        atCutGate={gate === "ASSETS"}
        pendingPreview={Boolean((v as unknown as { edd_preview?: unknown }).edd_preview)}
        previews={previews.filter((p): p is typeof p & { url: string } => Boolean(p.url))}
        captionsEnabled={v.enable_captions ?? true}
        sfxOptions={sfxOptions}
        sfxLive={Boolean(process.env.ELEVENLABS_API_KEY)}
        proEditor={(await getEditorFlags()).proEditor}
      />
    </div>
  );
}

function MissingCard({ projectId, videoId, reason }: { projectId: string; videoId: string; reason: string }) {
  return (
    <Card className="space-y-3">
      <h1 className="font-semibold">Editor unavailable</h1>
      <p className="text-sm text-muted">{reason}</p>
      <Link
        href={`/projects/${projectId}/videos/${videoId}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline"
      >
        <ArrowLeft className="size-4" /> Back to the video
      </Link>
    </Card>
  );
}

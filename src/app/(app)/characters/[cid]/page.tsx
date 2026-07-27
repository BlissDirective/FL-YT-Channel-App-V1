import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSignedMediaUrl } from "@/lib/storage";
import { listStyles, loadStudioState } from "@/lib/pipeline/character-studio";
import { modelCatalog } from "@/lib/models/catalog";
import { DEFAULT_REF_IMAGE_MODEL_ID } from "@/lib/adapters/reference-image";
import { CharacterStudio, type StudioLook, type StudioMessage } from "./studio-view";

export const dynamic = "force-dynamic";

/**
 * The Character Studio (Character Studio §4.2): chat on the left, the subject
 * on the right. One character, one style at a time — because a LOOK belongs to
 * a style, and the whole point of the split is that identity (the text) and
 * appearance (the image) are edited side by side.
 */
export default async function CharacterStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ cid: string }>;
  searchParams: Promise<{ style?: string }>;
}) {
  const { cid } = await params;
  const { style: styleParam } = await searchParams;

  const db = await createClient();
  const state = await loadStudioState(db, cid);
  if (!state) notFound();

  // Styles come from the projects this character is linked into — a style is
  // project-scoped, an identity is not.
  // Guarded, not sentinel-filtered: `.in("id", ["-"])` would make Postgres try
  // to cast "-" to uuid and fail the whole page for an unlinked character.
  const projects: { id: string; name: string }[] = [];
  if (state.projectIds.length > 0) {
    const { data: projectRows } = await db
      .from("projects")
      .select("id, name")
      .in("id", state.projectIds);
    projects.push(...(((projectRows ?? []) as { id: string; name: string }[]) ?? []));
  }

  const styles: { id: string; name: string; projectId: string; projectName: string; isDefault: boolean }[] = [];
  for (const p of projects) {
    for (const s of await listStyles(db, p.id)) {
      styles.push({
        id: s.id,
        name: s.name,
        projectId: p.id,
        projectName: p.name,
        isDefault: s.is_default,
      });
    }
  }
  const activeStyleId =
    styles.find((s) => s.id === styleParam)?.id ??
    styles.find((s) => s.isDefault)?.id ??
    styles[0]?.id ??
    null;

  const sign = async (path: string | null | undefined) =>
    path ? await getSignedMediaUrl(path) : null;

  const looks: StudioLook[] = [];
  for (const l of state.looks.filter((l) => l.style_id === activeStyleId)) {
    looks.push({
      lookType: l.look_type,
      canonicalPath: l.canonical_image_path,
      canonicalUrl: await sign(l.canonical_image_path),
      sheetUrl: await sign(l.sheet_image_path),
      stale: l.stale,
      status: l.status,
    });
  }

  const messages: StudioMessage[] = [];
  for (const m of state.messages) {
    const candidates: { path: string; url: string | null }[] = [];
    for (const p of m.candidate_asset_paths ?? []) {
      candidates.push({ path: p, url: await sign(p) });
    }
    messages.push({
      id: m.id,
      role: m.role === "user" ? "user" : "agent",
      content: m.content,
      candidates,
    });
  }

  const models = modelCatalog("reference-image").map((m) => ({
    id: m.id,
    label: m.label,
    unitUsd: m.unitUsd,
    badge: m.badge,
    pros: m.pros,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-4 pt-2">
      <Link
        href="/characters"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> All characters
      </Link>
      <CharacterStudio
        characterId={cid}
        name={state.character.name}
        role={state.character.role}
        description={state.character.description ?? ""}
        identityAnchor={state.character.identity_anchor ?? ""}
        aliases={state.character.aliases ?? []}
        status={state.character.status}
        version={state.character.version}
        descriptionOwned={Boolean(state.character.description_owned_by_operator)}
        spendUsd={state.spendUsd}
        softBudgetUsd={state.softBudgetUsd}
        styles={styles}
        activeStyleId={activeStyleId}
        looks={looks}
        messages={messages}
        models={models}
        defaultModelId={DEFAULT_REF_IMAGE_MODEL_ID}
      />
    </div>
  );
}

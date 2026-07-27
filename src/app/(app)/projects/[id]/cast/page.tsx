import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { getProject } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import { getSignedMediaUrl } from "@/lib/storage";
import { listCharacters, loadProjectCastDetail } from "@/lib/pipeline/character-studio";
import { modelCatalog } from "@/lib/models/catalog";
import { CHANNEL_PRESETS } from "@/lib/pipeline/channel-presets";
import { DEFAULT_REF_IMAGE_MODEL_ID } from "@/lib/adapters/reference-image";
import { StatusChip } from "@/components/ui/status-chip";
import { CastManager, PresenterToggle, RemoveFromProject } from "./cast-manager";

export const dynamic = "force-dynamic";

/**
 * A project's Cast (Character Studio §4.3): which global characters this
 * channel uses, and which art styles it renders them in. The characters
 * themselves are designed in the Studio — this page is the wiring.
 */
export default async function ProjectCastPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const db = await createClient();
  const { characters, looks, styles } = await loadProjectCastDetail(db, id);
  const all = await listCharacters(db);
  const linked = new Set(characters.map((c) => c.id));

  const thumbs = new Map<string, string>();
  for (const l of looks) {
    if (!l.canonical_image_path || thumbs.has(l.character_id)) continue;
    const url = await getSignedMediaUrl(l.canonical_image_path);
    if (url) thumbs.set(l.character_id, url);
  }

  const lookCount = (characterId: string, styleId: string) =>
    looks.filter((l) => l.character_id === characterId && l.style_id === styleId && l.canonical_image_path)
      .length;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-2">
      <Link
        href={`/projects/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Back to project
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cast &amp; styles</h1>
        <p className="mt-1 text-sm text-muted">{project.name}</p>
      </div>

      <CastManager
        projectId={id}
        styles={await Promise.all(
          styles.map(async (s) => ({
            id: s.id,
            name: s.name,
            styleString: s.style_string ?? "",
            exclusions: s.exclusions ?? "",
            isDefault: s.is_default,
            groupShotUrl: s.group_shot_path ? await getSignedMediaUrl(s.group_shot_path) : null,
          })),
        )}
        available={all
          .filter((c) => !linked.has(c.id))
          .map((c) => ({ id: c.id, name: c.name }))}
        models={modelCatalog("reference-image").map((m) => ({
          id: m.id,
          label: m.label,
          unitUsd: m.unitUsd,
          pros: m.pros,
        }))}
        sceneModelId={project.character_image_model ?? DEFAULT_REF_IMAGE_MODEL_ID}
        presets={CHANNEL_PRESETS.map((p) => ({ id: p.id, label: p.label, blurb: p.blurb }))}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">In this project</h2>
        {characters.length === 0 ? (
          <div className="rounded-card bg-card p-6 text-center shadow-card">
            <Users className="mx-auto size-5 text-muted" />
            <p className="mt-2 text-sm text-muted">
              No cast yet. Videos render exactly as they do today until you add one.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {characters.map((c) => (
              <li key={c.id} className="rounded-card bg-card p-3 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-card-warm">
                    {thumbs.has(c.id) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbs.get(c.id)} alt="" className="size-full object-cover" />
                    ) : (
                      <Users className="size-5 text-muted" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/characters/${c.id}`} className="truncate font-semibold hover:text-accent">
                        {c.name}
                      </Link>
                      <StatusChip tone={c.status === "locked" ? "success" : "warning"}>
                        {c.status === "locked" ? "locked" : "draft"}
                      </StatusChip>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <PresenterToggle
                        projectId={id}
                        characterId={c.id}
                        name={c.name}
                        isPresenter={c.role === "presenter"}
                      />
                      {styles.map((s) => (
                        <span
                          key={s.id}
                          className={
                            lookCount(c.id, s.id) > 0
                              ? "rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success"
                              : "rounded-full bg-raised px-2 py-0.5 text-[11px] font-semibold text-muted"
                          }
                        >
                          {s.name}: {lookCount(c.id, s.id) > 0 ? "look ready" : "no look yet"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <RemoveFromProject projectId={id} characterId={c.id} name={c.name} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

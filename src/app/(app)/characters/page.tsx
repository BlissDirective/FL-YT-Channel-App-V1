import Link from "next/link";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSignedMediaUrl } from "@/lib/storage";
import { listCharacters } from "@/lib/pipeline/character-studio";
import { StatusChip } from "@/components/ui/status-chip";
import { NewCharacter } from "./new-character";

export const dynamic = "force-dynamic";

/**
 * The global character library (Character Studio §4.1). Characters are
 * account-level, not project-level: one Bo, reusable in every channel, with a
 * separate LOOK per art style. This page is the front door to the Studio.
 */
export default async function CharactersPage() {
  if (!isSupabaseConfigured()) {
    return <div className="pt-2 text-sm text-muted">Connect Supabase first — see Settings.</div>;
  }
  const db = await createClient();
  const characters = await listCharacters(db);

  // One thumbnail per character: any locked look will do for a list row.
  const ids = characters.map((c) => c.id);
  const thumbs = new Map<string, string>();
  if (ids.length > 0) {
    const { data: looks } = await db
      .from("character_looks")
      .select("character_id, canonical_image_path")
      .in("character_id", ids);
    for (const l of (looks ?? []) as { character_id: string; canonical_image_path: string | null }[]) {
      if (!l.canonical_image_path || thumbs.has(l.character_id)) continue;
      const url = await getSignedMediaUrl(l.canonical_image_path);
      if (url) thumbs.set(l.character_id, url);
    }
  }

  const { data: projects } = await db.from("projects").select("id, name").order("name");

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Characters</h1>
        <p className="mt-1 text-sm text-muted">
          Design a character once, then reuse it across every video and channel. Each character
          keeps a separate look per art style.
        </p>
      </div>

      <NewCharacter projects={((projects ?? []) as { id: string; name: string }[]) ?? []} />

      {characters.length === 0 ? (
        <div className="rounded-card bg-card p-8 text-center shadow-card">
          <Users className="mx-auto size-6 text-muted" />
          <p className="mt-3 text-sm text-muted">
            No characters yet. Describe one above and the Studio will draft it with you.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {characters.map((c) => (
            <li key={c.id}>
              <Link
                href={`/characters/${c.id}`}
                className="flex items-center gap-3 rounded-card bg-card p-3 shadow-card transition-colors hover:bg-accent-soft"
              >
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-card-warm">
                  {thumbs.has(c.id) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbs.get(c.id)} alt="" className="size-full object-cover" />
                  ) : (
                    <Users className="size-5 text-muted" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold">{c.name}</span>
                    <StatusChip tone={c.status === "locked" ? "success" : "warning"}>
                      {c.status === "locked" ? "locked" : "draft"}
                    </StatusChip>
                  </span>
                  <span className="mt-0.5 line-clamp-1 block text-xs text-muted">
                    {c.description || "No description yet."}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

/**
 * Styles + cast wiring for one project (Character Studio §4.3).
 *
 * The one behaviour worth calling out in the UI: editing a style STRING does
 * not regenerate anything and does not spend anything — it marks the affected
 * looks stale so you can regenerate the ones you care about. The count comes
 * back from the server so the consequence is stated in numbers, not adjectives.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Palette, Plus, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createStyleAction,
  deleteStyleAction,
  linkCharacterAction,
  setDefaultStyleAction,
  unlinkCharacterAction,
  updateStyleAction,
} from "@/lib/actions/characters";

export type CastStyle = {
  id: string;
  name: string;
  styleString: string;
  exclusions: string;
  isDefault: boolean;
};

/**
 * Unlink, not delete. A character is global: taking it out of this channel
 * must never destroy it, because another channel may be using it.
 */
export function RemoveFromProject({
  projectId,
  characterId,
  name,
}: {
  projectId: string;
  characterId: string;
  name: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      aria-label={`Remove ${name} from this project`}
      title="Remove from this project (the character itself is kept)"
      className="grid size-7 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-coral/15 hover:text-coral"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await unlinkCharacterAction({ projectId, characterId });
          router.refresh();
        })
      }
    >
      <X className="size-4" />
    </button>
  );
}

export function CastManager({
  projectId,
  styles,
  available,
}: {
  projectId: string;
  styles: CastStyle[];
  available: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newStyle, setNewStyle] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ styleString: "", exclusions: "" });
  const [linkId, setLinkId] = useState(available[0]?.id ?? "");
  const [notice, setNotice] = useState<string | null>(null);

  const addStyle = () => {
    const name = newStyle.trim();
    if (!name || isPending) return;
    startTransition(async () => {
      const r = await createStyleAction({ projectId, name });
      setNotice(r.ok ? null : (r.error ?? "Could not create that style."));
      setNewStyle("");
      router.refresh();
    });
  };

  const startEdit = (s: CastStyle) => {
    setEditing(s.id);
    setDraft({ styleString: s.styleString, exclusions: s.exclusions });
  };

  const saveStyle = (styleId: string) => {
    startTransition(async () => {
      const r = await updateStyleAction({
        styleId,
        projectId,
        patch: { styleString: draft.styleString, exclusions: draft.exclusions || null },
      });
      setNotice(
        !r.ok
          ? (r.error ?? "Save failed.")
          : r.staleLooks
            ? `Saved. ${r.staleLooks} character look${r.staleLooks === 1 ? "" : "s"} now marked stale — they still render, and you can regenerate them one at a time in the Studio.`
            : "Saved.",
      );
      setEditing(null);
      router.refresh();
    });
  };

  const removeStyle = (styleId: string, name: string) => {
    if (!window.confirm(`Delete “${name}”? Every character look locked in this style is deleted with it. The characters themselves are untouched.`)) {
      return;
    }
    startTransition(async () => {
      const r = await deleteStyleAction({ styleId, projectId });
      setNotice(r.ok ? `Deleted “${name}”.` : (r.error ?? "Delete failed."));
      setEditing(null);
      router.refresh();
    });
  };

  const promote = (styleId: string) => {
    startTransition(async () => {
      await setDefaultStyleAction({ projectId, styleId });
      router.refresh();
    });
  };

  const link = () => {
    if (!linkId || isPending) return;
    startTransition(async () => {
      const r = await linkCharacterAction({ projectId, characterId: linkId });
      setNotice(r.ok ? null : (r.error ?? "Could not add that character."));
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {notice && <p className="rounded-card bg-accent/10 p-3 text-xs font-semibold">{notice}</p>}

      <section className="space-y-2 rounded-card bg-card p-4 shadow-card">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Palette className="size-4" /> Art styles
        </h2>
        <p className="text-xs text-muted">
          A style is the look of the whole channel. Several per project is normal — that&apos;s how
          you A/B two visual directions with the same cast.
        </p>

        {styles.map((s) => (
          <div key={s.id} className="rounded-xl bg-card-warm p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                {s.name}
                {s.isDefault && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold">
                    default
                  </span>
                )}
              </span>
              <div className="flex gap-1.5">
                {!s.isDefault && (
                  <Button variant="ghost" size="sm" onClick={() => promote(s.id)} disabled={isPending}>
                    <Star className="size-3.5" /> Make default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (editing === s.id ? setEditing(null) : startEdit(s))}
                >
                  {editing === s.id ? "Cancel" : "Edit"}
                </Button>
              </div>
            </div>
            {editing === s.id ? (
              <div className="mt-2 space-y-2">
                <textarea
                  className="min-h-20 w-full resize-y rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                  value={draft.styleString}
                  onChange={(e) => setDraft((d) => ({ ...d, styleString: e.target.value }))}
                  placeholder="Soft pastel flat-vector picture-book illustration, thick rounded outlines, flat shading."
                  aria-label="Style string"
                />
                <input
                  className="w-full rounded-full border border-line bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                  value={draft.exclusions}
                  onChange={(e) => setDraft((d) => ({ ...d, exclusions: e.target.value }))}
                  placeholder="No text, no logos, no watermarks."
                  aria-label="Exclusions"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveStyle(s.id)} disabled={isPending}>
                    Save style
                  </Button>
                  {!s.isDefault && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeStyle(s.id, s.name)}
                      disabled={isPending}
                    >
                      Delete style
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-1 line-clamp-2 text-xs text-muted">
                {s.styleString || "No style string yet — press Edit and describe the look."}
              </p>
            )}
          </div>
        ))}

        <div className="flex gap-2 pt-1">
          <input
            className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            placeholder="New style name — “Style A: pastel storybook”"
            value={newStyle}
            onChange={(e) => setNewStyle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addStyle();
              }
            }}
            aria-label="New style name"
          />
          <Button onClick={addStyle} disabled={isPending || !newStyle.trim()}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
      </section>

      {available.length > 0 && (
        <section className="space-y-2 rounded-card bg-card p-4 shadow-card">
          <h2 className="text-sm font-semibold">Add an existing character</h2>
          <div className="flex gap-2">
            <select
              className="min-w-0 flex-1 rounded-full border border-line bg-card px-3 py-2 text-sm"
              value={linkId}
              onChange={(e) => setLinkId(e.target.value)}
              aria-label="Character to add"
            >
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button onClick={link} disabled={isPending}>
              Add to project
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

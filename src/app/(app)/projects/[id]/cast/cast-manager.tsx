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
import { Mic, Palette, Plus, RefreshCw, Sparkles, Star, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  applyChannelPresetAction,
  createStyleAction,
  deleteStyleAction,
  estimateStyleLooksAction,
  generateGroupShotAction,
  generateStyleLooksAction,
  linkCharacterAction,
  setDefaultStyleAction,
  setPresenterAction,
  setSceneImageModelAction,
  unlinkCharacterAction,
  updateStyleAction,
} from "@/lib/actions/characters";

export type CastStyle = {
  id: string;
  name: string;
  styleString: string;
  exclusions: string;
  isDefault: boolean;
  /** Phase 4: one frame with the whole cast, carrying relative scale. */
  groupShotUrl?: string | null;
};

/**
 * The two batch operations that make a SECOND style practical (Phase 4).
 *
 * Adding a style to an existing channel otherwise means walking the whole cast
 * through the Studio one character at a time. Both buttons quote their total
 * cost first and produce DRAFTS — a batch run is a starting point to review,
 * not six locks nobody looked at.
 */
function StyleBatchTools({
  projectId,
  style,
  busy,
  onNotice,
}: {
  projectId: string;
  style: CastStyle;
  busy: boolean;
  onNotice: (msg: string | null) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [quote, setQuote] = useState<{ count: number; usd: number; staleOnly: boolean } | null>(null);
  const disabled = busy || isPending;

  const ask = (staleOnly: boolean) => {
    startTransition(async () => {
      const r = await estimateStyleLooksAction({ projectId, styleId: style.id, staleOnly });
      if (!r.ok) return onNotice(r.error ?? "Could not price that.");
      if (!r.count) {
        onNotice(
          staleOnly
            ? "No stale looks in this style — nothing to regenerate."
            : "Every character already has a look in this style.",
        );
        return;
      }
      setQuote({ count: r.count!, usd: r.usd!, staleOnly });
    });
  };

  const run = () => {
    if (!quote) return;
    const staleOnly = quote.staleOnly;
    setQuote(null);
    startTransition(async () => {
      const r = await generateStyleLooksAction({ projectId, styleId: style.id, staleOnly });
      if (!r.ok || !r.result) return onNotice(r.error ?? "Batch failed.");
      const { generated, failed, costUsd } = r.result;
      onNotice(
        `${generated.length} look${generated.length === 1 ? "" : "s"} generated as drafts` +
          `${costUsd > 0 ? ` · $${costUsd.toFixed(2)}` : " (mock mode — no charge)"}` +
          `${failed.length ? ` · ${failed.length} failed: ${failed.map((f) => f.name).join(", ")}` : ""}` +
          `. Open each character to review and lock.`,
      );
      router.refresh();
    });
  };

  const groupShot = () => {
    startTransition(async () => {
      const r = await generateGroupShotAction({ projectId, styleId: style.id });
      onNotice(
        r.ok
          ? `Group shot generated for ${r.names?.join(", ")}. Multi-character scenes now get it as an extra reference, which is what fixes relative height.`
          : (r.error ?? "Group shot failed."),
      );
      router.refresh();
    });
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <Button variant="ghost" size="sm" disabled={disabled} onClick={() => ask(false)}>
          <Users className="size-3.5" /> Looks for everyone
        </Button>
        <Button variant="ghost" size="sm" disabled={disabled} onClick={() => ask(true)}>
          <RefreshCw className="size-3.5" /> Regenerate stale
        </Button>
        <Button variant="ghost" size="sm" disabled={disabled} onClick={groupShot}>
          <Users className="size-3.5" /> {style.groupShotUrl ? "Redo group shot" : "Group shot"}
        </Button>
      </div>
      {style.groupShotUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={style.groupShotUrl} alt={`${style.name} cast group shot`} className="w-full rounded-lg" />
      )}
      {quote && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-accent-soft p-2">
          <span className="text-xs">
            {quote.count} character{quote.count === 1 ? "" : "s"} · ~${quote.usd.toFixed(2)}
          </span>
          <Button size="sm" disabled={disabled} onClick={run}>
            Generate
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setQuote(null)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Whose face talks (plan §8). Avatar shots lip-sync ONE image, so the operator
 * names the character rather than letting row order decide — and if that
 * character has no chest-up portrait yet, we say so, because an avatar model
 * fed a full-body illustration crops badly.
 */
export function PresenterToggle({
  projectId,
  characterId,
  name,
  isPresenter,
}: {
  projectId: string;
  characterId: string;
  name: string;
  isPresenter: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  if (isPresenter) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-lavender/15 px-2 py-0.5 text-[11px] font-semibold text-lavender"
        title="Avatar shots in this project lip-sync this character's portrait."
      >
        <Mic className="size-3" /> presenter
      </span>
    );
  }
  return (
    <>
      <button
        type="button"
        disabled={isPending}
        className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-muted hover:text-ink"
        onClick={() =>
          startTransition(async () => {
            const r = await setPresenterAction({ projectId, characterId });
            setMsg(
              !r.ok
                ? (r.error ?? "Could not set the presenter.")
                : r.hasPortrait
                  ? null
                  : `${name} drives avatars now, but has no chest-up portrait look yet — generate one in the Studio or avatar shots will crop a full-body illustration.`,
            );
            router.refresh();
          })
        }
      >
        Make presenter
      </button>
      {msg && <span className="text-[11px] text-accent">{msg}</span>}
    </>
  );
}

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
  models,
  sceneModelId,
  presets,
}: {
  projectId: string;
  styles: CastStyle[];
  available: { id: string; name: string }[];
  models: { id: string; label: string; unitUsd: number; pros: string[] }[];
  sceneModelId: string | null;
  presets: { id: string; label: string; blurb: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newStyle, setNewStyle] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ styleString: "", exclusions: "" });
  const [linkId, setLinkId] = useState(available[0]?.id ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [sceneModel, setSceneModel] = useState(sceneModelId ?? models[0]?.id ?? "");
  const activeModel = models.find((m) => m.id === sceneModel);

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
            <StyleBatchTools
              projectId={projectId}
              style={s}
              busy={isPending}
              onNotice={setNotice}
            />
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

      <section className="space-y-2 rounded-card bg-card p-4 shadow-card">
        <h2 className="text-sm font-semibold">Scene image model</h2>
        <p className="text-xs text-muted">
          Beats that a locked character appears in are rendered on this model, conditioned on their
          reference image — that&apos;s what keeps them recognisable shot to shot. Beats with nobody
          in them are unaffected and stay on the usual cheap path.
        </p>
        <select
          className="w-full rounded-full border border-line bg-card px-3 py-2 text-sm"
          value={sceneModel}
          onChange={(e) => {
            setSceneModel(e.target.value);
            startTransition(async () => {
              const r = await setSceneImageModelAction({ projectId, modelId: e.target.value || null });
              setNotice(r.ok ? null : (r.error ?? "Could not save that."));
              router.refresh();
            });
          }}
          aria-label="Scene image model"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} — ${m.unitUsd.toFixed(2)} per cast beat
            </option>
          ))}
        </select>
        {activeModel && <p className="text-[11px] text-muted">{activeModel.pros[0]}</p>}
      </section>

      {presets.length > 0 && styles.length === 0 && (
        <section className="space-y-2 rounded-card bg-card p-4 shadow-card">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4" /> Start from a channel preset
          </h2>
          {presets.map((p) => (
            <div key={p.id} className="rounded-xl bg-card-warm p-3">
              <p className="text-sm font-semibold">{p.label}</p>
              <p className="mt-1 text-xs text-muted">{p.blurb}</p>
              <Button
                className="mt-2"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await applyChannelPresetAction({ projectId, presetId: p.id });
                    if (!r.ok || !r.report) return setNotice(r.error ?? "Import failed.");
                    const { stylesCreated, charactersCreated, charactersLinked, stylesExisting } =
                      r.report;
                    setNotice(
                      `Imported ${charactersCreated.length + charactersLinked.length} characters and ` +
                        `${stylesCreated.length} style${stylesCreated.length === 1 ? "" : "s"}` +
                        `${stylesExisting.length ? ` (${stylesExisting.length} already existed and were left alone)` : ""}. ` +
                        `Nothing was generated yet — use “Looks for everyone” per style when you're ready to spend.`,
                    );
                    router.refresh();
                  })
                }
              >
                Import cast &amp; styles
              </Button>
            </div>
          ))}
        </section>
      )}

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

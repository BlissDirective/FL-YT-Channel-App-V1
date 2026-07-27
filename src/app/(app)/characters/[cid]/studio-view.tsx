"use client";

/**
 * The Character Studio split view (Character Studio §4.2).
 *
 * LEFT: the design chat — the main driver, exactly as in the Workspace.
 * RIGHT: the subject — the current look, the description the pipeline actually
 * injects, the identity anchor, and the one button that spends money.
 *
 * Three things this UI is deliberately strict about:
 *  - The cost is on the button. You always know what a grid costs before you
 *    press it, and the running per-character total is visible next to it.
 *  - The description is editable text, not an agent-owned black box. Editing it
 *    hands you ownership permanently; after that the agent proposes.
 *  - Lock is one button with a plain-language consequence, not a status field.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Images,
  Lock,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import {
  acceptProposalAction,
  deleteCharacterAction,
  generateCandidatesAction,
  generatePortraitLookAction,
  generateSheetAction,
  lockCharacterAction,
  sendDesignMessageAction,
  updateCharacterAction,
  uploadCharacterReferenceAction,
} from "@/lib/actions/characters";

export type StudioLook = {
  lookType: "illustration" | "portrait";
  canonicalPath: string | null;
  canonicalUrl: string | null;
  sheetUrl: string | null;
  stale: boolean;
  status: "draft" | "locked";
};

export type StudioMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
  candidates: { path: string; url: string | null }[];
};

export type StudioProps = {
  characterId: string;
  name: string;
  role: string;
  description: string;
  identityAnchor: string;
  aliases: string[];
  status: "draft" | "locked";
  version: number;
  descriptionOwned: boolean;
  spendUsd: number;
  softBudgetUsd: number;
  styles: { id: string; name: string; projectId: string; projectName: string; isDefault: boolean }[];
  activeStyleId: string | null;
  looks: StudioLook[];
  messages: StudioMessage[];
  models: { id: string; label: string; unitUsd: number; badge: string | null; pros: string[] }[];
  defaultModelId: string;
};

const GRID_SIZES = [2, 4, 6, 8];

export function CharacterStudio(props: StudioProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [thread, setThread] = useState<StudioMessage[]>(props.messages);
  const [text, setText] = useState("");
  const [styleId, setStyleId] = useState(props.activeStyleId ?? "");
  const [modelId, setModelId] = useState(props.defaultModelId);
  const [count, setCount] = useState(4);
  const [candidates, setCandidates] = useState<{ path: string; url: string | null }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [description, setDescription] = useState(props.description);
  const [anchor, setAnchor] = useState(props.identityAnchor);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** The agent's latest un-applied rewrite, held until you accept it (Q8). */
  const [proposal, setProposal] = useState<{ description: string; identityAnchor: string } | null>(null);
  const threadEnd = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Server-rendered state wins after any router.refresh().
  useEffect(() => setThread(props.messages), [props.messages]);
  useEffect(() => setDescription(props.description), [props.description]);
  useEffect(() => setAnchor(props.identityAnchor), [props.identityAnchor]);

  const illustration = props.looks.find((l) => l.lookType === "illustration") ?? null;
  const portrait = props.looks.find((l) => l.lookType === "portrait") ?? null;
  const model = props.models.find((m) => m.id === modelId);
  const gridCost = (model?.unitUsd ?? 0) * count;
  const overBudget = props.spendUsd >= props.softBudgetUsd;

  const append = (role: "user" | "agent", content: string, cands: StudioMessage["candidates"] = []) => {
    setThread((t) => [...t, { id: `local-${Date.now()}-${Math.random()}`, role, content, candidates: cands }]);
    setTimeout(() => threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
  };

  const send = () => {
    const message = text.trim();
    if (!message || isPending) return;
    append("user", message);
    setText("");
    startTransition(async () => {
      const r = await sendDesignMessageAction({
        characterId: props.characterId,
        text: message,
        styleId: styleId || null,
      });
      if (!r.ok || !r.turn) {
        append("agent", `Something went wrong: ${r.error ?? "unknown error"}`);
        return;
      }
      append("agent", r.turn.reply);
      if (r.turn.applied) {
        setDescription(r.turn.draft.description);
        setProposal(null);
      } else {
        setProposal({
          description: r.turn.draft.description,
          identityAnchor: r.turn.draft.identityAnchor,
        });
      }
      router.refresh();
    });
  };

  const generate = () => {
    if (!styleId || isPending) return;
    append("user", `Generate ${count} ${count === 1 ? "candidate" : "candidates"}.`);
    startTransition(async () => {
      const r = await generateCandidatesAction({
        characterId: props.characterId,
        styleId,
        count,
        modelId,
      });
      if (!r.ok || !r.result) {
        append("agent", `Generation failed: ${r.error ?? "unknown error"}`);
        return;
      }
      const cands = r.result.paths.map((p) => ({ path: p, url: null as string | null }));
      setCandidates(cands);
      setSelected(null);
      const spent =
        r.result.costUsd > 0
          ? `$${r.result.costUsd.toFixed(2)}`
          : `no charge (mock mode — add a FAL_KEY to render for real, this would cost ~$${r.result.estimateUsd.toFixed(2)})`;
      append("agent", `${r.result.paths.length} candidates · ${spent}. Pick the one that's most on-model and lock it.`);
      if (r.result.warning) setNotice(r.result.warning);
      router.refresh();
    });
  };

  const lock = () => {
    const path = selected ?? candidates[0]?.path;
    if (!path || !styleId || isPending) return;
    startTransition(async () => {
      const r = await lockCharacterAction({
        characterId: props.characterId,
        styleId,
        canonicalImagePath: path,
        generateSheet: true,
      });
      if (!r.ok) {
        append("agent", `Could not lock: ${r.error}`);
        return;
      }
      append(
        "agent",
        `Locked ${props.name} (v${r.version}). This image and the description below now go into every scene ${props.name} appears in${r.sheetPath ? ", and a three-view turnaround sheet was generated as a backup reference" : ""}.`,
      );
      if (r.warning) setNotice(r.warning);
      setCandidates([]);
      router.refresh();
    });
  };

  const saveText = () => {
    startTransition(async () => {
      const r = await updateCharacterAction({
        characterId: props.characterId,
        patch: { description, identityAnchor: anchor || null },
      });
      setSavedAt(r.ok ? new Date().toLocaleTimeString() : null);
      if (!r.ok) append("agent", `Save failed: ${r.error}`);
      router.refresh();
    });
  };

  const acceptProposal = () => {
    if (!proposal || isPending) return;
    const p = proposal;
    startTransition(async () => {
      const r = await acceptProposalAction({
        characterId: props.characterId,
        description: p.description,
        identityAnchor: p.identityAnchor || null,
      });
      if (!r.ok) {
        append("agent", `Could not apply that: ${r.error}`);
        return;
      }
      setDescription(p.description);
      setAnchor(p.identityAnchor);
      setProposal(null);
      append("agent", "Applied. It's still your text — I'll keep proposing rather than overwriting.");
      router.refresh();
    });
  };

  const regenerateSheet = () => {
    if (!styleId || isPending) return;
    startTransition(async () => {
      const r = await generateSheetAction({ characterId: props.characterId, styleId, modelId });
      append(
        "agent",
        r.ok ? "New turnaround sheet generated from the locked look." : `Sheet failed: ${r.error}`,
      );
      router.refresh();
    });
  };

  const destroy = () => {
    if (
      !window.confirm(
        `Delete ${props.name}? Its looks are deleted with it, in every project. Videos already generated are unaffected.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await deleteCharacterAction({ characterId: props.characterId });
      if (!r.ok) {
        append("agent", `Delete failed: ${r.error}`);
        return;
      }
      router.push("/characters");
    });
  };

  const makePortrait = () => {
    if (!styleId || isPending) return;
    startTransition(async () => {
      const r = await generatePortraitLookAction({ characterId: props.characterId, styleId, modelId });
      append(
        "agent",
        r.ok
          ? "Portrait look created — this is the chest-up framing the avatar models want."
          : `Portrait failed: ${r.error}`,
      );
      router.refresh();
    });
  };

  const upload = (file: File) => {
    if (!styleId) return;
    const fd = new FormData();
    fd.set("reference", file);
    startTransition(async () => {
      const r = await uploadCharacterReferenceAction(props.characterId, styleId, fd);
      append(
        "agent",
        r.ok
          ? "Reference saved. Every generation from here on is conditioned on it."
          : `Upload failed: ${r.error}`,
      );
      router.refresh();
    });
  };

  /* ── The subject panel ───────────────────────────────────────── */
  const subject = (
    <div className="space-y-3 rounded-card bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight">{props.name}</h1>
          <p className="text-xs text-muted">
            {props.role} · v{props.version}
          </p>
        </div>
        <StatusChip tone={props.status === "locked" ? "success" : "warning"}>
          {props.status === "locked" ? "locked" : "draft"}
        </StatusChip>
      </div>

      {props.styles.length === 0 ? (
        <p className="rounded-xl bg-accent-soft p-3 text-xs">
          This character isn&apos;t in a project with an art style yet. Add it to a project and
          create a style there — a look belongs to a style, so there&apos;s nothing to render into
          until one exists.
        </p>
      ) : (
        <select
          className="w-full rounded-full border border-line bg-card px-3 py-2 text-xs font-semibold"
          value={styleId}
          onChange={(e) => {
            setStyleId(e.target.value);
            setCandidates([]);
            router.push(`/characters/${props.characterId}?style=${e.target.value}`);
          }}
          aria-label="Art style"
        >
          {props.styles.map((s) => (
            <option key={s.id} value={s.id}>
              {s.projectName} · {s.name}
              {s.isDefault ? " (default)" : ""}
            </option>
          ))}
        </select>
      )}

      {/* The current look */}
      <div className="overflow-hidden rounded-xl bg-card-warm">
        {illustration?.canonicalUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={illustration.canonicalUrl} alt={props.name} className="w-full object-cover" />
        ) : (
          <div className="grid aspect-video place-items-center text-center text-xs text-muted">
            <span>
              <UserRound className="mx-auto mb-1 size-6" />
              {illustration ? "Generated in mock mode — no image to show." : "No look in this style yet."}
            </span>
          </div>
        )}
      </div>
      {illustration?.stale && (
        <p className="rounded-xl bg-accent/10 p-2 text-xs">
          The art style changed after this look was locked. It still works — regenerate when you
          want it to match exactly.
        </p>
      )}

      {/* Generate — the one control that spends money */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            aria-label="Image model"
          >
            {props.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} (${m.unitUsd.toFixed(2)}/img)
              </option>
            ))}
          </select>
          <select
            className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            aria-label="How many candidates"
          >
            {GRID_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} candidates
              </option>
            ))}
          </select>
        </div>
        {model && <p className="text-[11px] text-muted">{model.pros[0]}</p>}
        <Button className="w-full" onClick={generate} disabled={isPending || !styleId}>
          <Sparkles className="size-4" />
          {isPending ? "Working…" : `Generate · ~$${gridCost.toFixed(2)}`}
        </Button>
        <p className={overBudget ? "text-[11px] font-semibold text-accent" : "text-[11px] text-muted"}>
          ${props.spendUsd.toFixed(2)} spent designing {props.name} · soft budget $
          {props.softBudgetUsd.toFixed(2)} (a warning, never a block)
        </p>
      </div>

      {/* Candidate grid */}
      {candidates.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold">Pick the most on-model one</p>
          <div className="grid grid-cols-2 gap-2">
            {candidates.map((c) => (
              <button
                key={c.path}
                onClick={() => setSelected(c.path)}
                className={`overflow-hidden rounded-xl border-2 transition-colors ${
                  selected === c.path ? "border-accent" : "border-transparent"
                }`}
                aria-label={`Select candidate ${c.path}`}
                aria-pressed={selected === c.path}
              >
                {c.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.url} alt="" className="aspect-video w-full object-cover" />
                ) : (
                  <span className="grid aspect-video place-items-center bg-card-warm text-[10px] text-muted">
                    <Images className="size-4" />
                  </span>
                )}
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={lock} disabled={isPending || !selected}>
            <Lock className="size-4" /> Lock this look
          </Button>
        </div>
      )}

      {/* The text the pipeline actually injects */}
      <div className="space-y-2 border-t border-line pt-3">
        <label className="block text-xs font-semibold" htmlFor="cs-description">
          Description — injected into every scene this character appears in
        </label>
        <textarea
          id="cs-description"
          className="min-h-24 w-full resize-y rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Who they are — species, age, colours, wardrobe. No art style: that lives on the style."
        />
        <label className="block text-xs font-semibold" htmlFor="cs-anchor">
          Identity anchor — the one detail that must survive every frame
        </label>
        <input
          id="cs-anchor"
          className="w-full rounded-full border border-line bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          value={anchor}
          onChange={(e) => setAnchor(e.target.value)}
          placeholder="mustard-yellow tee with a white star"
        />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={saveText} disabled={isPending}>
            <Check className="size-3.5" /> Save
          </Button>
          {savedAt && <span className="text-[11px] text-muted">Saved {savedAt}</span>}
          {props.descriptionOwned && (
            <span className="text-[11px] text-muted">
              You own this text — the agent proposes, never overwrites.
            </span>
          )}
        </div>
        {proposal && (
          <div className="space-y-2 rounded-xl bg-accent-soft p-3">
            <p className="text-[11px] font-semibold">The agent proposes this instead:</p>
            <p className="whitespace-pre-wrap text-xs">{proposal.description}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={acceptProposal} disabled={isPending}>
                Use this version
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setProposal(null)}>
                Keep mine
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Extras */}
      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={isPending || !styleId}>
          <Upload className="size-3.5" /> Add reference
        </Button>
        <Button variant="ghost" size="sm" onClick={makePortrait} disabled={isPending || !styleId}>
          <UserRound className="size-3.5" /> {portrait ? "Redo portrait" : "Portrait look"}
        </Button>
        {illustration?.sheetUrl && (
          <a
            href={illustration.sheetUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:bg-accent-soft"
          >
            <Images className="size-3.5" /> Turnaround sheet
          </a>
        )}
        {illustration?.canonicalPath && (
          <Button variant="ghost" size="sm" onClick={regenerateSheet} disabled={isPending}>
            <RefreshCw className="size-3.5" /> {illustration.sheetUrl ? "Redo sheet" : "Make sheet"}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={destroy} disabled={isPending}>
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </div>
      {portrait?.canonicalUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={portrait.canonicalUrl} alt="Portrait look" className="w-24 rounded-xl" />
      )}
    </div>
  );

  /* ── The chat ────────────────────────────────────────────────── */
  const chat = (
    <div className="flex min-h-[24rem] flex-col rounded-card bg-card p-4 shadow-card">
      <div className="flex-1 space-y-3 overflow-y-auto">
        {thread.length === 0 && (
          <p className="text-sm text-muted">
            Describe {props.name} in your own words — species, age, colours, what they wear. I&apos;ll
            turn it into a description the image models can hold steady, then you generate and lock a
            look.
          </p>
        )}
        {thread.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={`inline-block max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "bg-accent-soft" : "bg-card-warm"
              }`}
            >
              {m.content}
            </div>
            {m.candidates.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-1">
                {m.candidates.map((c) =>
                  c.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={c.path} src={c.url} alt="" className="aspect-square rounded-lg object-cover" />
                  ) : null,
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={threadEnd} />
      </div>
      <div className="mt-3 flex items-end gap-2">
        <textarea
          className="max-h-32 min-h-[44px] w-full resize-y rounded-2xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          rows={1}
          placeholder="e.g. “a shy lilac-grey bunny in a mint scarf, ears always slightly down”"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          aria-label="Message the design agent"
        />
        <Button onClick={send} disabled={isPending || !text.trim()} aria-label="Send">
          {isPending ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {notice && (
        <p className="rounded-card bg-accent/10 p-3 text-xs font-semibold">{notice}</p>
      )}
      {/* Mobile: subject first, chat under the thumb. Desktop: chat left. */}
      <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-start">
        <div className="lg:flex-1">{chat}</div>
        <div className="lg:w-80 lg:shrink-0">{subject}</div>
      </div>
    </div>
  );
}

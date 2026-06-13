"use client";

import { useState, useTransition } from "react";
import { Bookmark, Loader2, Send, Sparkles } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { scoutChatAction, saveScoutIdeaAction } from "@/lib/actions/intelligence";
import type { ScoutMessage } from "@/lib/adapters/scout";

const PROMPTS = [
  "Tear down the top channels in my niche",
  "What proven topics am I missing?",
  "Which format is over-performing right now?",
];

export function ScoutChat({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<ScoutMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [savedNote, setSavedNote] = useState<string>();
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaAngle, setIdeaAngle] = useState("");
  const [saving, startSaving] = useTransition();

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean || isPending) return;
    const next: ScoutMessage[] = [...messages, { role: "user", content: clean }];
    setMessages(next);
    setInput("");
    setError(undefined);
    startTransition(async () => {
      const r = await scoutChatAction(projectId, next);
      if (r.ok && r.reply) {
        setMessages((m) => [...m, { role: "assistant", content: r.reply! }]);
      } else {
        setError(r.error ?? "Scout hit an error.");
      }
    });
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-2xl bg-lavender/20 text-ink">
          <Sparkles className="size-4" />
        </span>
        <CardTitle>Scout — research copilot</CardTitle>
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => send(p)}
              className="rounded-full bg-canvas px-3 py-1.5 text-xs font-medium text-ink hover:bg-accent-soft"
            >
              {p}
            </button>
          ))}
        </div>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-accent-soft px-3 py-2 text-sm"
                  : "mr-auto max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-canvas px-3 py-2 text-sm"
              }
            >
              {m.content}
            </div>
          ))}
          {isPending && (
            <div className="mr-auto flex items-center gap-2 rounded-2xl bg-canvas px-3 py-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" /> Scouting…
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm font-medium text-coral">{error}</p>}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask Scout about your niche or a competitor…"
          className="min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          disabled={isPending || !input.trim()}
          onClick={() => send(input)}
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink text-white disabled:opacity-50"
          aria-label="Send"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </div>

      <details className="rounded-xl bg-canvas p-3">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted">
          Save a finding as an idea card
        </summary>
        <div className="mt-2 space-y-2">
          <input
            value={ideaTitle}
            onChange={(e) => setIdeaTitle(e.target.value)}
            placeholder="Idea title"
            className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            value={ideaAngle}
            onChange={(e) => setIdeaAngle(e.target.value)}
            placeholder="Angle (one line)"
            className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving || !ideaTitle.trim()}
              onClick={() =>
                startSaving(async () => {
                  setSavedNote(undefined);
                  const r = await saveScoutIdeaAction(projectId, ideaTitle, ideaAngle);
                  if (r.ok) {
                    setSavedNote("Saved to the review queue ✓");
                    setIdeaTitle("");
                    setIdeaAngle("");
                  } else {
                    setSavedNote(r.error);
                  }
                })
              }
              className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink shadow-card disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Bookmark className="size-4" />}
              Save idea
            </button>
            {savedNote && <span className="text-xs text-muted">{savedNote}</span>}
          </div>
        </div>
      </details>
    </Card>
  );
}

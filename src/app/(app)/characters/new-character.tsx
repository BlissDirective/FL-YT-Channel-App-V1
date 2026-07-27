"use client";

/**
 * Frictionless entry to the Studio (transition decision 7): one box. Type a
 * name, press New — you land in the chat with the character already created,
 * because a blank creation FORM is a gate, and gates are what we removed.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCharacterAction } from "@/lib/actions/characters";
import type { CharacterRole } from "@/lib/pipeline/character-studio";

const ROLES: { value: CharacterRole; label: string }[] = [
  { value: "cast", label: "Cast" },
  { value: "presenter", label: "Presenter" },
  { value: "prop", label: "Prop" },
  { value: "location", label: "Location" },
];

export function NewCharacter({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [role, setRole] = useState<CharacterRole>("cast");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed || isPending) return;
    setError(null);
    startTransition(async () => {
      const r = await createCharacterAction({
        name: trimmed,
        role,
        projectId: projectId || null,
      });
      if (!r.ok || !r.characterId) {
        setError(r.error ?? "Could not create that character.");
        return;
      }
      router.push(`/characters/${r.characterId}`);
    });
  };

  return (
    <div className="rounded-card bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          placeholder="Name a character — “Bo”, “Breeze the bunny”…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              create();
            }
          }}
          aria-label="Character name"
        />
        <select
          className="rounded-full border border-line bg-card px-3 py-2.5 text-xs font-semibold"
          value={role}
          onChange={(e) => setRole(e.target.value as CharacterRole)}
          aria-label="Role"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {projects.length > 0 && (
          <select
            className="rounded-full border border-line bg-card px-3 py-2.5 text-xs font-semibold"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            aria-label="Add to project"
          >
            <option value="">No project yet</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <Button onClick={create} disabled={isPending || !name.trim()}>
          <Plus className="size-4" /> {isPending ? "Creating…" : "New"}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-coral">{error}</p>}
    </div>
  );
}

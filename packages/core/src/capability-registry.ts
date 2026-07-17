/**
 * Capability registry (OpenMontage Remixed list2 #7/#9/#10/#11/#29).
 *
 * A declarative registry of what the studio CAN do, keyed to the services each
 * capability needs. Adding a capability is config, not code (list2-#7). Each
 * entry carries the setup EFFORT (env var / install / hardware, #11), a
 * STABILITY tier (production / beta / test, #29), and the exact UNLOCK steps —
 * so Settings can render a "X of Y configured · here's what you can do now /
 * could unlock" menu (#10) instead of a flat credential list.
 *
 * Pure — the app passes in which services are present; this computes what's
 * available and what each locked capability needs.
 */

export type SetupEffort = "env" | "install" | "hardware";
export type StabilityTier = "production" | "beta" | "test";

export type Capability = {
  id: string;
  label: string;
  description: string;
  category: "Core" | "Visuals" | "Audio" | "Research" | "Publishing" | "Control";
  /** Service keys (see getServiceHealth) that must ALL be present. */
  requires: string[];
  effort: SetupEffort;
  stability: StabilityTier;
  /** Human unlock steps for the locked state. */
  unlock: string[];
};

export const CAPABILITIES: Capability[] = [
  {
    id: "database", label: "Project database & storage", category: "Core",
    description: "Store projects, scripts, assets, and spend.",
    requires: ["supabase"], effort: "env", stability: "production",
    unlock: ["Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY"],
  },
  {
    id: "scripts", label: "Scripts, scoring & agents", category: "Core",
    description: "Write scripts, score beats, and run the agent crew.",
    requires: ["anthropic"], effort: "env", stability: "production",
    unlock: ["Set ANTHROPIC_API_KEY (console.anthropic.com)"],
  },
  {
    id: "ai-video", label: "AI video clips", category: "Visuals",
    description: "Generate Seedance / Kling / Veo / LTX / Wan clips per beat.",
    requires: ["fal"], effort: "env", stability: "production",
    unlock: ["Set FAL_KEY (fal.ai/dashboard/keys)"],
  },
  {
    id: "stock", label: "Stock footage", category: "Visuals",
    description: "Free Pexels b-roll for establishing beats.",
    requires: ["pexels"], effort: "env", stability: "production",
    unlock: ["Set PEXELS_API_KEY (pexels.com/api)"],
  },
  {
    id: "voiceover", label: "Voiceover", category: "Audio",
    description: "Word-timestamped ElevenLabs narration.",
    requires: ["elevenlabs"], effort: "env", stability: "production",
    unlock: ["Set ELEVENLABS_API_KEY (elevenlabs.io)"],
  },
  {
    id: "music", label: "Music & soundtrack bed", category: "Audio",
    description: "Generated soundtrack with narration-aware ducking.",
    requires: ["elevenlabs"], effort: "env", stability: "beta",
    unlock: ["Set ELEVENLABS_API_KEY", "Enable music in project settings"],
  },
  {
    id: "research", label: "Trend & topic research", category: "Research",
    description: "YouTube-informed idea and topic discovery.",
    requires: ["youtube"], effort: "env", stability: "production",
    unlock: ["Set YOUTUBE_API_KEY (a YouTube Data API v3 key)"],
  },
  {
    id: "free-footage", label: "Free documentary footage (CLIP retrieval)", category: "Visuals",
    description: "Archive.org / Wikimedia real motion via CLIP retrieval — no paid video API.",
    requires: ["clip_index"], effort: "install", stability: "test",
    unlock: ["Deploy the CLIP retrieval index service", "Set CLIP_INDEX_URL"],
  },
  {
    id: "publishing", label: "YouTube publishing", category: "Publishing",
    description: "Upload finished videos to your channel.",
    requires: ["youtube_oauth"], effort: "env", stability: "beta",
    unlock: [
      "Set YOUTUBE_OAUTH_CLIENT_ID / _SECRET / _REFRESH_TOKEN on the render farm",
    ],
  },
  {
    id: "mcp", label: "Operate from Claude (MCP)", category: "Control",
    description: "Drive the studio from Claude via the MCP server.",
    requires: ["studio_mcp"], effort: "env", stability: "beta",
    unlock: ["Set STUDIO_MCP_TOKEN"],
  },
  {
    id: "local-render", label: "Local GPU render farm", category: "Visuals",
    description: "Self-hosted rendering for higher throughput.",
    requires: ["gpu"], effort: "hardware", stability: "test",
    unlock: ["Provision a CUDA GPU worker", "Point the render queue at it"],
  },
];

export type CapabilityStatus = Capability & { available: boolean; missing: string[] };

/** Resolve each capability against the present services. Pure. */
export function computeCapabilities(present: Record<string, boolean>): CapabilityStatus[] {
  return CAPABILITIES.map((c) => {
    const missing = c.requires.filter((k) => !present[k]);
    return { ...c, available: missing.length === 0, missing };
  });
}

export function capabilitySummary(statuses: CapabilityStatus[]): { available: number; total: number } {
  return { available: statuses.filter((s) => s.available).length, total: statuses.length };
}

export const SETUP_EFFORT_LABEL: Record<SetupEffort, string> = {
  env: "Add an env var",
  install: "Install / deploy",
  hardware: "Hardware",
};

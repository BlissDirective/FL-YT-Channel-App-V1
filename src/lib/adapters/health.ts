/**
 * Credential health — reports which provider env vars are present so the
 * Settings page can show 🟢/🔴 per service without exposing values.
 * Live "test" pings live in credential-test.ts; presence is the cheap signal here.
 */

export type ServiceHealth = {
  key: string;
  label: string;
  phase: string;
  present: boolean;
  required: boolean;
};

export function getServiceHealth(): ServiceHealth[] {
  const has = (name: string) => Boolean(process.env[name]);
  return [
    {
      key: "supabase",
      label: "Supabase (database, auth, storage)",
      phase: "0",
      present:
        has("NEXT_PUBLIC_SUPABASE_URL") &&
        has("NEXT_PUBLIC_SUPABASE_ANON_KEY") &&
        has("SUPABASE_SERVICE_ROLE_KEY"),
      required: true,
    },
    {
      key: "trigger",
      label: "Trigger.dev (orchestration)",
      phase: "3",
      present: has("TRIGGER_SECRET_KEY"),
      required: false,
    },
    {
      key: "anthropic",
      label: "Anthropic Claude (scripts, scoring, agents)",
      phase: "4",
      present: has("ANTHROPIC_API_KEY"),
      required: false,
    },
    {
      key: "elevenlabs",
      label: "ElevenLabs (voiceover)",
      phase: "4",
      present: has("ELEVENLABS_API_KEY"),
      required: false,
    },
    {
      key: "fal",
      label: "fal.ai (video clips, thumbnails)",
      phase: "5",
      present: has("FAL_KEY"),
      required: false,
    },
    {
      key: "pexels",
      label: "Pexels (stock footage)",
      phase: "5",
      present: has("PEXELS_API_KEY"),
      required: false,
    },
    {
      key: "youtube",
      label: "YouTube Data API (research, stats)",
      phase: "7",
      present: has("YOUTUBE_API_KEY") || has("YOUTUBE_DATA_API_V3"),
      required: false,
    },
    {
      key: "studio_mcp",
      label: "Studio MCP server (operate the app from Claude)",
      phase: "9",
      present: has("STUDIO_MCP_TOKEN"),
      required: false,
    },
  ];
}

/** Services that support a live "test" ping from the settings panel. */
export const TESTABLE_SERVICES = [
  "anthropic",
  "elevenlabs",
  "fal",
  "pexels",
  "youtube",
] as const;
export type TestableService = (typeof TESTABLE_SERVICES)[number];

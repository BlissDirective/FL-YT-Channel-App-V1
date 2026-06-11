/**
 * Credential health — reports which provider env vars are present so the
 * Settings page can show 🟢/🔴 per service without exposing values.
 * Phase 4+ will add live "test" pings; presence is the Phase 1 signal.
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
  ];
}

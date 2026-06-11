/**
 * Voice provider adapter (ElevenLabs). Mock-first: returns a stable set of
 * sample voices until ELEVENLABS_API_KEY is present (Phase 4 wires live
 * synthesis + the real voice library).
 */

export type Voice = {
  id: string;
  name: string;
  description: string;
  previewUrl?: string;
};

const MOCK_VOICES: Voice[] = [
  { id: "mock-aria", name: "Aria", description: "Warm, conversational female — explainer-friendly" },
  { id: "mock-atlas", name: "Atlas", description: "Authoritative male — documentary narration" },
  { id: "mock-sage", name: "Sage", description: "Calm, measured neutral — finance & education" },
  { id: "mock-nova", name: "Nova", description: "Energetic female — list & hook-driven content" },
  { id: "mock-orion", name: "Orion", description: "Deep, dramatic male — dark history & true crime" },
];

export function isVoiceLive(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

export async function getMockVoices(): Promise<Voice[]> {
  // Phase 4 will branch here on isVoiceLive() to fetch the real library.
  return MOCK_VOICES;
}

import "server-only";

/**
 * ElevenLabs Voice Design — a designed (never cloned) voice from a text
 * description, for a channel's recurring cast (brand_kit.voiceCast).
 *
 * Two calls: design → a few previews (audio + a generated_voice_id), then
 * save the chosen preview as a permanent voice. The current endpoints are
 * /v1/text-to-voice/design and /v1/text-to-voice; the older
 * create-previews / create-voice-from-preview pair is tried on a 404/405 so
 * an API revision can't strand production.
 */

const API = "https://api.elevenlabs.io/v1";

export type VoicePreview = { generatedVoiceId: string; audio: Buffer; contentType: string; durationSec: number };

export function isVoiceDesignLive(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

function headers() {
  return { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "content-type": "application/json" };
}

async function post(paths: string[], body: Record<string, unknown>): Promise<unknown> {
  let last = "";
  for (const path of paths) {
    const res = await fetch(`${API}${path}`, { method: "POST", headers: headers(), body: JSON.stringify(body) });
    if (res.ok) return res.json();
    last = `ElevenLabs ${path} ${res.status}: ${(await res.text()).slice(0, 240)}`;
    if (res.status !== 404 && res.status !== 405) break;
  }
  throw new Error(last);
}

/** Generate previews for a voice description. `text` is what the previews
    say (100–1000 chars); omitted → ElevenLabs writes a fitting sample. */
export async function designVoice(opts: { description: string; text?: string }): Promise<VoicePreview[]> {
  if (!isVoiceDesignLive()) throw new Error("ElevenLabs is not configured");
  const description = opts.description.trim();
  if (description.length < 20) throw new Error("voice description must be at least 20 characters");
  const text = opts.text?.trim();
  const useText = text && text.length >= 100 && text.length <= 1000 ? text : undefined;
  const json = (await post(["/text-to-voice/design", "/text-to-voice/create-previews"], {
    voice_description: description.slice(0, 1000),
    ...(useText ? { text: useText } : { auto_generate_text: true }),
  })) as { previews?: { audio_base_64?: string; generated_voice_id?: string; media_type?: string; duration_secs?: number }[] };
  const previews = (json.previews ?? []).filter((p) => p.audio_base_64 && p.generated_voice_id);
  if (!previews.length) throw new Error("ElevenLabs returned no voice previews");
  return previews.map((p) => ({
    generatedVoiceId: p.generated_voice_id!,
    audio: Buffer.from(p.audio_base_64!, "base64"),
    contentType: p.media_type || "audio/mpeg",
    durationSec: Number(p.duration_secs ?? 0),
  }));
}

/** Save a preview as a permanent voice; returns the new voice_id. */
export async function saveDesignedVoice(opts: { name: string; description: string; generatedVoiceId: string }): Promise<string> {
  if (!isVoiceDesignLive()) throw new Error("ElevenLabs is not configured");
  const json = (await post(["/text-to-voice", "/text-to-voice/create-voice-from-preview"], {
    voice_name: opts.name.slice(0, 100),
    voice_description: opts.description.slice(0, 1000),
    generated_voice_id: opts.generatedVoiceId,
  })) as { voice_id?: string };
  if (!json.voice_id) throw new Error("ElevenLabs returned no voice_id");
  return json.voice_id;
}

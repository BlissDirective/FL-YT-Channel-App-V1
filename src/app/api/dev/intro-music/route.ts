import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadMedia } from "@/lib/storage";
import { generateMusicBed, isMusicLive } from "@/lib/adapters/music";
import { planMusic } from "@studio/core";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Admin utility: generate (and cache) a channel's reusable intro-music sting and
 * store its path on projects.brand_kit.heroIntro.musicPath so the branded
 * ChannelIntro plays music. Instrumental, generated once per channel via
 * ElevenLabs Music. Auth'd by the operator session (RLS scopes the writes).
 *
 * POST { projectId, seconds?, prompt? } → { ok, path } | { ok:false, error }
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  let body: { projectId?: string; seconds?: number; prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const projectId = body.projectId;
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, brand_kit")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });

  const brand = (project.brand_kit ?? {}) as {
    heroIntro?: { enabled?: boolean; title?: string; tagline?: string; seconds?: number; musicPath?: string };
  };
  const seconds = Math.min(20, Math.max(6, Number(body.seconds) || Number(brand.heroIntro?.seconds) || 13));

  if (!isMusicLive()) {
    return NextResponse.json({ ok: false, error: "ELEVENLABS_API_KEY not set — music is mock-only here" }, { status: 503 });
  }

  const prompt =
    body.prompt?.trim() ||
    "A modern, exciting news-broadcast WELCOME intro sting: upbeat and slightly poppy but sophisticated and premium. " +
      "Punchy driving synth pulse with bright plucks and airy pads, a short rising build that lands on one clean impact hit, " +
      "tight electronic percussion, confident tech/finance broadcast energy. Fully instrumental, no vocals, no speech. " +
      "Starts immediately with energy and resolves cleanly at the end.";

  // generateMusicBed only reads plan.prompt; derive a valid plan then override
  // the brief with our intro-sting prompt.
  const plan = { ...planMusic({ niche: "finance news", musicEnabled: true, kind: "long" }), prompt };

  const bed = await generateMusicBed(plan, seconds);
  if (!bed.audio || bed.provider === "mock") {
    return NextResponse.json({ ok: false, error: "Music generation returned mock/no audio" }, { status: 502 });
  }

  const stamp = Date.now().toString(36);
  const path = `channel-intro/${projectId}/intro-music-${stamp}.mp3`;
  await uploadMedia(path, Buffer.from(bed.audio), bed.contentType || "audio/mpeg");

  const nextBrand = {
    ...brand,
    heroIntro: { ...(brand.heroIntro ?? {}), musicPath: path },
  };
  const { error: upErr } = await supabase.from("projects").update({ brand_kit: nextBrand }).eq("id", projectId);
  if (upErr) return NextResponse.json({ ok: false, error: `DB update failed: ${upErr.message}` }, { status: 500 });

  return NextResponse.json({ ok: true, path, seconds, costUsd: bed.costUsd, provider: bed.provider });
}

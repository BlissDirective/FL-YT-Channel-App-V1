"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mockScript } from "@/lib/pipeline/mock-content";
import { DEFAULT_SCRIPT_TEMPLATE } from "@/lib/pipeline/templates";
import type { BrandKit, Budget } from "@/lib/db/types";

export type ProjectResult = { error?: string };

function parseBrandKit(formData: FormData): BrandKit {
  return {
    primary: String(formData.get("brand_primary") ?? "#F5B829"),
    secondary: String(formData.get("brand_secondary") ?? "#17150F"),
    thumbnailStyle: String(formData.get("thumbnail_style") ?? "cinematic"),
    font: String(formData.get("brand_font") ?? "bold-sans"),
  };
}

function parseBudget(formData: FormData): Budget {
  return {
    perVideoUsd: Number(formData.get("budget_per_video") ?? 15),
    monthlyUsd: Number(formData.get("budget_monthly") ?? 150),
  };
}

function parseAutonomy(formData: FormData) {
  const mode = (gate: string) =>
    String(formData.get(`autonomy_${gate}`) ?? "assist");
  return {
    IDEA: mode("IDEA"),
    SCRIPT: mode("SCRIPT"),
    ASSETS: mode("ASSETS"),
    FINAL: mode("FINAL"),
  };
}

export async function createProject(
  _prev: ProjectResult,
  formData: FormData,
): Promise<ProjectResult> {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Project name is required." };

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name,
      niche: String(formData.get("niche") ?? ""),
      audience: String(formData.get("audience") ?? ""),
      angle: String(formData.get("angle") ?? ""),
      tone: String(formData.get("tone") ?? "authoritative"),
      brand_kit: parseBrandKit(formData),
      voice_id: String(formData.get("voice_id") ?? "") || null,
      voice_name: String(formData.get("voice_name") ?? "") || null,
      autonomy: parseAutonomy(formData),
      budget: parseBudget(formData),
      rpm_usd: Number(formData.get("rpm_usd") ?? 2),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/");
  redirect(`/projects/${data.id}`);
}

export async function updateProject(
  _prev: ProjectResult,
  formData: FormData,
): Promise<ProjectResult> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing project id." };

  const { error } = await supabase
    .from("projects")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      niche: String(formData.get("niche") ?? ""),
      audience: String(formData.get("audience") ?? ""),
      angle: String(formData.get("angle") ?? ""),
      tone: String(formData.get("tone") ?? "authoritative"),
      brand_kit: parseBrandKit(formData),
      voice_id: String(formData.get("voice_id") ?? "") || null,
      voice_name: String(formData.get("voice_name") ?? "") || null,
      autonomy: parseAutonomy(formData),
      budget: parseBudget(formData),
      rpm_usd: Number(formData.get("rpm_usd") ?? 2),
      status: String(formData.get("status") ?? "active"),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
  return {};
}

/** Seeds a demo project with videos across the pipeline so every screen
    has realistic data before the first real project exists. */
export async function createDemoProject(): Promise<void> {
  const supabase = await createClient();

  // Idempotent: double-taps before the page revalidates must not create
  // duplicate demo projects.
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("is_demo", true)
    .limit(1)
    .maybeSingle();
  if (existing) {
    revalidatePath("/");
    return;
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      name: "Money Mindset (Demo)",
      niche: "Personal Finance",
      audience:
        "Young professionals who want to build wealth but struggle with consistency",
      angle: "Psychology-first money education with story-driven hooks",
      tone: "curious",
      is_demo: true,
      brand_kit: {
        primary: "#F5B829",
        secondary: "#17150F",
        thumbnailStyle: "cinematic",
        font: "bold-sans",
      },
    })
    .select("id")
    .single();
  if (error || !project) return;

  const demoVideos = [
    { title: "Why Banks Fail (And Where Your Money Really Goes)", status: "SCRIPT_READY", topic: "bank failures explained", format: "story" },
    { title: "7 Money Habits That Quietly Make You Rich", status: "GENERATING_ASSETS", topic: "wealth-building habits", format: "list" },
    { title: "The Psychology of Impulse Spending", status: "FINAL_REVIEW", topic: "impulse spending psychology", format: "explainer" },
    { title: "How Compound Interest Actually Works", status: "TRACKING", topic: "compound interest", format: "explainer", youtube_video_id: "demo00000xx", viewScale: 1 },
    { title: "The Money Story That Hooks Every Viewer", status: "TRACKING", topic: "money storytelling", format: "story", youtube_video_id: "demo00000yy", viewScale: 2.4 },
    { title: "The 50/30/20 Rule Is Wrong — Here's Why", status: "IDEA", topic: "budgeting rules critique", format: "explainer" },
  ];

  for (const { viewScale, ...v } of demoVideos) {
    const { data: video } = await supabase
      .from("videos")
      .insert({ project_id: project.id, ...v })
      .select("id")
      .single();
    // Videos seeded at or past the script stage get coherent mock artifacts
    // so the review queue has real content to show.
    if (video && v.status !== "IDEA") {
      const draft = mockScript({
        title: v.title,
        topic: v.topic,
        tone: "curious",
        targetLengthSec: 480,
      });
      await supabase.from("scripts").insert({
        video_id: video.id,
        version: 1,
        body: draft.body,
        beats: draft.beats,
        runtime_sec: draft.runtimeSec,
        metadata: draft.metadata,
      });
    }
    if (video && v.status === "FINAL_REVIEW") {
      await supabase.from("assets").insert({
        video_id: video.id,
        kind: "render",
        provider: "mock:remotion",
        storage_path: `mock/${video.id}/final.mp4`,
        meta: { resolution: "1080p", durationSec: 480, variant: "long" },
      });
    }
    // The published demo video gets a render, a crowned thumbnail, and a
    // rising snapshot history so the Publish Kit + tracking dashboards have
    // real data before any live YouTube id exists.
    if (video && v.status === "TRACKING") {
      const publishedAt = new Date(Date.now() - 6 * 86_400_000).toISOString();
      await supabase.from("videos").update({ published_at: publishedAt }).eq("id", video.id);
      await supabase.from("assets").insert([
        {
          video_id: video.id,
          kind: "render",
          provider: "mock:remotion",
          storage_path: `mock/${video.id}/final.mp4`,
          meta: { resolution: "1080p", durationSec: 510, variant: "long" },
        },
        {
          video_id: video.id,
          kind: "thumb",
          provider: "mock:fal",
          storage_path: `mock/${video.id}/thumb.jpg`,
          meta: { selected: true },
        },
      ]);
      const scale = viewScale ?? 1;
      const curve = [420, 980, 1840, 2610, 3300, 4120].map((v2) => Math.round(v2 * scale));
      await supabase.from("analytics_snapshots").insert(
        curve.map((views, i) => ({
          video_id: video.id,
          captured_at: new Date(Date.now() - (curve.length - 1 - i) * 86_400_000).toISOString(),
          views,
          likes: Math.round(views * 0.043),
          comments: Math.round(views * 0.006),
          meta: { source: "demo" },
        })),
      );
    }
  }

  // A seeded Optimizer insight so /insights is alive on the demo — one with a
  // one-tap script-template tune the operator can apply (and revert via
  // versioning).
  await supabase.from("insights").insert({
    project_id: project.id,
    kind: "optimizer",
    title: "“story” videos outperform — lead with narrative hooks",
    body:
      "Your story-format videos average ~2.4× the views of explainers. Bias the next batch toward narrative cold-opens: open on a concrete person/stakes before any teaching. The proposed template revision bakes this in.",
    evidence: { metric: "avg views by format", videoCount: 2 },
    proposed_template_kind: "script",
    proposed_template_body:
      DEFAULT_SCRIPT_TEMPLATE +
      "\n\nOPTIMIZER TUNING (applied): Open beat 1 as a narrative cold-open — a specific person and a concrete stake in the first two sentences — before any explanation. Favor story structure over list structure unless the topic demands enumeration.",
  });

  await supabase.from("ideas").insert([
    {
      project_id: project.id,
      title: "What Happens If You Never Check Your Bank Account",
      angle: "Reframe as a 30-day experiment story",
      score: 8.5,
      flag: "HIGH_VALUE",
      source: { views: 847000, channelSubs: 45000 },
    },
    {
      project_id: project.id,
      title: "Millionaires Who Live Like They're Broke",
      angle: "Same data, better visualization hook",
      score: 7.2,
      flag: "HIGH_VALUE",
      source: { views: 312000, channelSubs: 89000 },
    },
  ]);

  revalidatePath("/");
}

export async function deleteProject(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await supabase.from("projects").delete().eq("id", id);
    revalidatePath("/");
  }
  redirect("/");
}

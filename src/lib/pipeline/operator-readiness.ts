import "server-only";
import { analyticsConfigured } from "@/lib/adapters/youtube-analytics";
import { isTelegramLive } from "@/lib/adapters/telegram";
import type { Project } from "@/lib/db/types";

/**
 * Operator go-live preflight (Phase F). A safety checklist surfaced on the
 * homepage so an autonomous run is never started half-wired. 'fail' blocks a
 * confident launch (publishing/brain/kill-switch); 'warn' is degraded-but-OK.
 */

export type ReadyStatus = "ok" | "warn" | "fail";
export type ReadyCheck = { key: string; label: string; status: ReadyStatus; detail: string };
export type Readiness = { checks: ReadyCheck[]; ready: boolean; fails: number; warns: number };

const ok = (key: string, label: string, detail: string): ReadyCheck => ({ key, label, status: "ok", detail });
const warn = (key: string, label: string, detail: string): ReadyCheck => ({ key, label, status: "warn", detail });
const fail = (key: string, label: string, detail: string): ReadyCheck => ({ key, label, status: "fail", detail });

async function webhookRegistered(): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    if (!res.ok) return false;
    const d = (await res.json()) as { result?: { url?: string } };
    return Boolean(d.result?.url && d.result.url.includes("/api/telegram/webhook"));
  } catch {
    return false;
  }
}

export async function operatorReadiness(
  project: Project,
  opts?: { strategyPulled?: boolean; killSwitch?: boolean },
): Promise<Readiness> {
  const env = process.env;
  const checks: ReadyCheck[] = [];

  // Content brain — scripts, QC, guardrails, vision all need Claude.
  checks.push(
    env.ANTHROPIC_API_KEY
      ? ok("brain", "Content brain (Claude)", "connected")
      : fail("brain", "Content brain (Claude)", "ANTHROPIC_API_KEY missing — scripts/QC/guardrails need it"),
  );

  // Voiceover.
  checks.push(
    env.ELEVENLABS_API_KEY
      ? ok("vo", "Voiceover", "ElevenLabs connected")
      : warn("vo", "Voiceover", "no ElevenLabs key — videos use mock VO"),
  );

  // Visuals — the cheap stack needs stock and/or fal stills.
  const fal = env.FAL_KEY || env.FAL_AI_FULL_ACCESS_DEVELOPMENT_KEY || env.FAL_AI_KEY;
  checks.push(
    env.PEXELS_API_KEY || fal
      ? ok("vis", "Visuals", env.PEXELS_API_KEY ? "stock + stills ready" : "stills ready")
      : warn("vis", "Visuals", "no Pexels/fal key — visuals fall back to mock"),
  );

  // YouTube publishing.
  const ytUpload =
    env.YOUTUBE_OAUTH_CLIENT_ID &&
    env.YOUTUBE_OAUTH_CLIENT_SECRET &&
    (project.youtube_refresh_token || env.YOUTUBE_OAUTH_REFRESH_TOKEN);
  checks.push(
    ytUpload
      ? ok("yt", "YouTube publishing", project.youtube_refresh_token ? "channel connected" : "using default channel")
      : fail("yt", "YouTube publishing", "no channel refresh token — cannot publish"),
  );

  // YouTube Analytics (optimization signal) — non-blocking.
  if (!analyticsConfigured(project.youtube_refresh_token)) {
    checks.push(warn("ytan", "Analytics", "no analytics token/scope — strategy disabled"));
  } else {
    checks.push(
      opts?.strategyPulled
        ? ok("ytan", "Analytics", "live — strategy populated")
        : warn("ytan", "Analytics", "token set — first daily pull pending"),
    );
  }

  // Telegram approvals + webhook.
  if (!isTelegramLive()) {
    checks.push(warn("tg", "Telegram approvals", "not configured — approve in-app instead"));
  } else {
    checks.push(
      (await webhookRegistered())
        ? ok("tg", "Telegram approvals", "bot + webhook ready")
        : warn("tg", "Telegram approvals", "bot set, webhook NOT registered — run /api/telegram/register once"),
    );
  }

  // Cron auth.
  checks.push(
    env.CRON_SECRET
      ? ok("cron", "Cron auth", "secured")
      : warn("cron", "Cron auth", "CRON_SECRET unset — cron routes are open"),
  );

  // Kill switch.
  if (opts?.killSwitch) checks.push(fail("kill", "Kill switch", "ON — nothing will run until you turn it off"));

  // Channel active.
  checks.push(
    project.status === "active"
      ? ok("proj", "Channel", "active")
      : warn("proj", "Channel", "paused — the operator won't produce while paused"),
  );

  const fails = checks.filter((c) => c.status === "fail").length;
  const warns = checks.filter((c) => c.status === "warn").length;
  return { checks, ready: fails === 0, fails, warns };
}

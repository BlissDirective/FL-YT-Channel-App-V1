import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  answerCallback,
  resolveCard,
  sendTelegram,
  telegramWebhookSecret,
} from "@/lib/adapters/telegram";
import { secureEquals } from "@/lib/secure-compare";
import {
  approveOperatorVideo,
  skipOperatorVideo,
  loadOperatorVideo,
  pauseOperator,
  startOperator,
  operatorSnapshot,
} from "@/lib/pipeline/operator";
import type { OperatorRun } from "@/lib/db/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Telegram webhook for the Auto Pilot Operator. Handles inline-button callbacks
 * (Approve / Skip a held video) and text commands (/status, /pause, /resume).
 * Locked down two ways: the secret token Telegram echoes in a header, and the
 * chat id (only the operator's own chat is acted on). See
 * docs/Auto-Pilot-Operator-build-plan.md.
 */

function authorized(request: NextRequest): boolean {
  const secret = telegramWebhookSecret();
  if (!secret) return false;
  return secureEquals(request.headers.get("x-telegram-bot-api-secret-token"), secret);
}

const ownChat = (id: unknown) => String(id) === (process.env.TELEGRAM_CHAT_ID?.trim() || "");

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true }); // ignore malformed
  }

  try {
    const db = createAdminClient();

    // ── Inline button callbacks ──
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data ?? "";
      const messageId = cq.message?.message_id;
      if (!ownChat(cq.message?.chat?.id)) {
        await answerCallback(cq.id);
        return NextResponse.json({ ok: true });
      }
      const [verb, videoId] = data.split(":");
      if ((verb === "ap" || verb === "sk") && videoId) {
        const loaded = await loadOperatorVideo(db, videoId);
        if (!loaded) {
          await answerCallback(cq.id, "That video is no longer available.");
          return NextResponse.json({ ok: true });
        }
        const rev = loaded.video.operator_review ?? {};
        if (rev.decided) {
          await answerCallback(cq.id, `Already ${rev.decided}.`);
          return NextResponse.json({ ok: true });
        }
        if (verb === "ap") {
          await approveOperatorVideo(db, loaded.video, "telegram");
          await answerCallback(cq.id, "Approved ✓");
          if (messageId) await resolveCard(messageId, `✅ Approved — "${loaded.video.title}" scheduled to post.`);
        } else {
          await skipOperatorVideo(db, loaded.video, "telegram");
          await answerCallback(cq.id, "Skipped");
          if (messageId) await resolveCard(messageId, `⏭ Skipped — "${loaded.video.title}".`);
        }
      } else {
        await answerCallback(cq.id);
      }
      return NextResponse.json({ ok: true });
    }

    // ── Text commands ──
    const msg = update.message;
    if (msg?.text && ownChat(msg.chat?.id)) {
      const cmd = msg.text.trim().toLowerCase().split(/\s+/)[0];
      const { data: runs } = await db.from("operator_runs").select("*").in("status", ["active", "paused"]);
      const live = (runs ?? []) as OperatorRun[];

      if (cmd === "/status") {
        if (live.length === 0) {
          await sendTelegram("No Auto Pilot run is live.");
        } else {
          const lines = await Promise.all(
            live.map(async (r) => {
              const { data: p } = await db.from("projects").select("name").eq("id", r.project_id).maybeSingle();
              const s = await operatorSnapshot(db, r);
              return `<b>${(p as { name?: string })?.name ?? "Channel"}</b> — ${s.status}\nDay ${s.cycleDay}/30 · $${s.spentUsd.toFixed(2)}/$${s.budgetUsd.toFixed(0)} · ${s.videosThisCycle} this cycle`;
            }),
          );
          await sendTelegram(lines.join("\n\n"));
        }
      } else if (cmd === "/pause") {
        for (const r of live) await pauseOperator(db, r.project_id);
        await sendTelegram(`⏸ Paused ${live.length} run${live.length === 1 ? "" : "s"}. Budget clock keeps elapsing.`);
      } else if (cmd === "/resume" || cmd === "/start") {
        for (const r of live) await startOperator(db, r.project_id);
        await sendTelegram(`▶️ Resumed ${live.length} run${live.length === 1 ? "" : "s"}.`);
      } else if (cmd === "/help") {
        await sendTelegram("Commands: /status · /pause · /resume\nApprove or Skip videos with the buttons on each card.");
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("telegram webhook failed:", err);
    return NextResponse.json({ ok: true }); // 200 so Telegram doesn't hammer-retry
  }
}

// Minimal shapes of the Telegram Update we use.
type TelegramUpdate = {
  message?: { text?: string; chat?: { id?: number | string } };
  callback_query?: {
    id: string;
    data?: string;
    message?: { message_id?: number; chat?: { id?: number | string } };
  };
};

import "server-only";

/**
 * Telegram notifier for the Auto Pilot Operator — approval cards (one-tap
 * Approve / Skip / Preview), Start/Pause controls, and the weekly digest. Live
 * when TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID are set. Pluggable: a Slack notifier
 * could implement the same surface later. See docs/Auto-Pilot-Operator-build-plan.md.
 */

const TOKEN = () => process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
const CHAT_ID = () => process.env.TELEGRAM_CHAT_ID?.trim() || "";
const APP_BASE = () =>
  (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://fl-yt-channel-app-v1.vercel.app").replace(/\/$/, "");

export function isTelegramLive(): boolean {
  return Boolean(TOKEN() && CHAT_ID());
}

/** The webhook secret Telegram echoes back in a header — reuse CRON_SECRET so we
    don't add another secret. */
export function telegramWebhookSecret(): string {
  return process.env.CRON_SECRET?.trim() || "";
}

type InlineButton = { text: string; callback_data?: string; url?: string };

async function api(method: string, body: Record<string, unknown>): Promise<unknown> {
  const token = TOKEN();
  if (!token) return null;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`telegram ${method} ${res.status}: ${(await res.text()).slice(0, 160)}`);
    return null;
  }
  return res.json();
}

/** Send a message to the operator's chat (HTML), with optional inline buttons. */
export async function sendTelegram(
  text: string,
  buttons?: InlineButton[][],
): Promise<void> {
  if (!isTelegramLive()) return;
  await api("sendMessage", {
    chat_id: CHAT_ID(),
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
  });
}

export async function answerCallback(callbackQueryId: string, text?: string): Promise<void> {
  await api("answerCallbackQuery", { callback_query_id: callbackQueryId, ...(text ? { text } : {}) });
}

/** Strip the buttons off a card and append the decision, after the operator acts. */
export async function resolveCard(
  messageId: number,
  appendText: string,
): Promise<void> {
  await api("editMessageReplyMarkup", { chat_id: CHAT_ID(), message_id: messageId, reply_markup: { inline_keyboard: [] } });
  await sendTelegram(appendText);
}

/** The approval card for a rendered, QC-passed operator video. */
export async function sendApprovalCard(opts: {
  projectId: string;
  videoId: string;
  title: string;
  kind: string;
  qc: number | null;
  slot: string | null;
  /** This video's own cost (distinct from the channel's cycle spend). */
  spentUsd?: number;
  /** Editorial-guard caution flags (publishable, but worth your eyes). */
  caution?: string[];
}): Promise<void> {
  const qcLine =
    (opts.qc != null ? ` · QC <b>${opts.qc.toFixed(1)}</b>/10` : "") +
    (opts.spentUsd != null ? ` · $${opts.spentUsd.toFixed(2)} this video` : "");
  const slotLine = opts.slot ? `\n🕐 Scheduled ${fmtSlot(opts.slot)}` : "";
  const cautionLine =
    opts.caution && opts.caution.length
      ? `\n⚠️ <i>${opts.caution.slice(0, 3).map(escapeHtml).join("; ")}</i>`
      : "";
  const text =
    `🎬 <b>Awaiting approval</b>${qcLine}\n` +
    `${escapeHtml(opts.title)}\n` +
    `<i>${opts.kind === "short" ? "Short" : "Long-form"}</i>${slotLine}${cautionLine}`;
  await sendTelegram(text, [
    [
      { text: "✅ Approve", callback_data: `ap:${opts.videoId}` },
      { text: "⏭ Skip", callback_data: `sk:${opts.videoId}` },
    ],
    [{ text: "👀 Preview", url: `${APP_BASE()}/projects/${opts.projectId}/videos/${opts.videoId}` }],
  ]);
}

/** A video a guardrail held for manual review (no one-tap approval offered). */
export async function sendReviewNeeded(opts: {
  projectId: string;
  videoId: string;
  title: string;
  reason: string;
  flags?: string[];
}): Promise<void> {
  const flagLines = opts.flags && opts.flags.length ? `\n• ${opts.flags.slice(0, 3).map(escapeHtml).join("\n• ")}` : "";
  const text =
    `⚠️ <b>Held for review</b>\n` +
    `${escapeHtml(opts.title)}\n` +
    `<i>${escapeHtml(opts.reason)}</i>${flagLines}`;
  await sendTelegram(text, [
    [{ text: "👀 Review", url: `${APP_BASE()}/projects/${opts.projectId}/videos/${opts.videoId}` }],
  ]);
}

/** The weekly digest. */
export async function sendDigest(opts: {
  projectName: string;
  cycleDay: number;
  posted: number;
  spentUsd: number;
  budgetUsd: number;
  awaiting: number;
  /** YPP progress (from YouTube Analytics) when available. */
  subs?: number;
  watchHours365?: number;
  retentionPct?: number;
  topSubtopics?: string[];
}): Promise<void> {
  const compact = (n: number) => Intl.NumberFormat("en", { notation: "compact" }).format(n);
  const ypp =
    opts.subs != null || opts.watchHours365 != null
      ? `\n📈 Toward YPP: <b>${compact(opts.subs ?? 0)}</b>/1,000 subs · <b>${(opts.watchHours365 ?? 0).toFixed(0)}</b>/4,000 watch-hrs` +
        (opts.retentionPct ? ` · ${opts.retentionPct.toFixed(0)}% retention` : "")
      : "";
  const winners = opts.topSubtopics && opts.topSubtopics.length ? `\n🏆 Working: <i>${escapeHtml(opts.topSubtopics.join(", "))}</i>` : "";
  const text =
    `📊 <b>${escapeHtml(opts.projectName)} — weekly digest</b>\n` +
    `Cycle day ${opts.cycleDay}/30\n` +
    `Posted: <b>${opts.posted}</b> · Awaiting approval: <b>${opts.awaiting}</b>\n` +
    `Spend: <b>$${opts.spentUsd.toFixed(2)}</b> / $${opts.budgetUsd.toFixed(0)}` +
    ypp +
    winners;
  await sendTelegram(text, [[{ text: "Open channel", url: `${APP_BASE()}` }]]);
}

function fmtSlot(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }) + " CT";
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

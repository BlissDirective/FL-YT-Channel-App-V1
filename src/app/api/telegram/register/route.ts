import { NextResponse, type NextRequest } from "next/server";
import { telegramWebhookSecret } from "@/lib/adapters/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * One-time (idempotent) Telegram webhook registration. Points the bot at this
 * app's /api/telegram/webhook with the secret token, so inline Approve/Skip and
 * the /status, /pause, /resume commands reach us. Gated by CRON_SECRET. Hit it
 * once after deploy:
 *   curl -X POST "https://<app>/api/telegram/register?key=$CRON_SECRET"
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const fromHeader = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const fromQuery = request.nextUrl.searchParams.get("key")?.trim();
  if (!secret || (fromHeader !== secret && fromQuery !== secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN not set" }, { status: 400 });

  const webhookUrl = `${new URL(request.url).origin}/api/telegram/webhook`;
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: telegramWebhookSecret(),
      allowed_updates: ["message", "callback_query"],
    }),
  });
  const body = await res.json().catch(() => ({}));
  return NextResponse.json({ ok: res.ok, webhookUrl, telegram: body });
}

export const GET = handle;
export const POST = handle;

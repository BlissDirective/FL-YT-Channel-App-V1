import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Web-push delivery for gate-arrival notifications. No-op until VAPID keys
 * exist in the environment, so the pipeline never depends on push being
 * configured.
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:ops@faceless.studio";

export function isPushConfigured(): boolean {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY);
}

export async function sendPushToAll(payload: {
  title: string;
  body: string;
  url: string;
}): Promise<void> {
  if (!isPushConfigured()) return;
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY!, PRIVATE_KEY!);

  const supabase = createAdminClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, keys");

  await Promise.allSettled(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys as { p256dh: string; auth: string },
          },
          JSON.stringify(payload),
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // Subscription expired or revoked — prune it.
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );
}

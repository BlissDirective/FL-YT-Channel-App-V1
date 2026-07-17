"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
} from "@/lib/actions/pipeline";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";

type State = "unsupported" | "no-keys" | "off" | "on" | "denied";

export function NotificationsCard({ vapidPublicKey }: { vapidPublicKey?: string }) {
  const [state, setState] = useState<State>("off");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (!vapidPublicKey) {
      setState("no-keys");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    });
  }, [vapidPublicKey]);

  const enable = () =>
    startTransition(async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!),
      });
      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      const result = await savePushSubscriptionAction({
        endpoint: json.endpoint,
        keys: json.keys,
        userAgent: navigator.userAgent,
      });
      setState(result.ok ? "on" : "off");
    });

  const disable = () =>
    startTransition(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    });

  return (
    <Card>
      <CardTitle>Notifications</CardTitle>
      <p className="mb-4 text-sm text-muted">
        Get a push notification on this device whenever a video reaches a
        review gate — approve from your phone without keeping the app open.
        Install the app to your home screen first for the best experience.
      </p>
      {state === "unsupported" && (
        <StatusChip tone="neutral">Not supported in this browser</StatusChip>
      )}
      {state === "no-keys" && (
        <StatusChip tone="neutral">Push keys not configured on the server</StatusChip>
      )}
      {state === "denied" && (
        <StatusChip tone="coral">
          Notifications blocked — allow them in browser settings
        </StatusChip>
      )}
      {(state === "on" || state === "off") && (
        <button
          type="button"
          disabled={isPending}
          onClick={state === "on" ? disable : enable}
          className="flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent shadow-card transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : state === "on" ? (
            <BellOff className="size-4" />
          ) : (
            <Bell className="size-4" />
          )}
          {state === "on" ? "Disable on this device" : "Enable on this device"}
        </button>
      )}
    </Card>
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

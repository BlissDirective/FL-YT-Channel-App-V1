"use client";

/**
 * ClickMax transition decision 6 (Phase 3): Autopilot/gate notification
 * channels — Telegram and web push — each independently toggleable per
 * project (projects.notify_prefs; the engine's gate arrivals honor them).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { ToggleRow } from "@/components/ui/toggle-row";
import { saveNotifyPrefsAction } from "@/lib/actions/workspace";

export function NotificationsPrefsCard({
  projectId,
  initial,
}: {
  projectId: string;
  initial: { telegram?: boolean; webpush?: boolean };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [prefs, setPrefs] = useState({
    telegram: initial.telegram !== false,
    webpush: initial.webpush !== false,
  });

  const set = (key: "telegram" | "webpush", value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    startTransition(async () => {
      await saveNotifyPrefsAction({ projectId, prefs: next });
      router.refresh();
    });
  };

  return (
    <Card>
      <CardTitle>Notifications</CardTitle>
      <p className="mb-3 text-sm text-muted">
        Where to ping you when a stage is ready for review or Autopilot hits a
        milestone. Each channel is independent.
      </p>
      <ToggleRow
        label="Telegram"
        description="Gate arrivals and Autopilot milestones via the Telegram bot"
        checked={prefs.telegram}
        onChange={(v: boolean) => set("telegram", v)}
      />
      <ToggleRow
        label="Web push"
        description="Browser/phone push notifications"
        checked={prefs.webpush}
        onChange={(v: boolean) => set("webpush", v)}
      />
    </Card>
  );
}

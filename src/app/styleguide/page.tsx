"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clapperboard,
  DollarSign,
  Eye,
  FileText,
  Film,
  Lightbulb,
  ThumbsUp,
  TrendingUp,
  Upload,
} from "lucide-react";
import { ActivityFeed } from "@/components/ui/activity-feed";
import { Card, CardTitle } from "@/components/ui/card";
import { ComboChart } from "@/components/ui/combo-chart";
import { FlowDiagram } from "@/components/ui/flow-diagram";
import { PillTabs } from "@/components/ui/pill-tabs";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SemicircleGauge } from "@/components/ui/semicircle-gauge";
import { StatCard } from "@/components/ui/stat-card";
import { StatusChip } from "@/components/ui/status-chip";
import { ToggleRow } from "@/components/ui/toggle-row";

const CHART_DATA = [
  { label: "Mon", a: 8.2, b: 4.1, line: 6.3 },
  { label: "Tue", a: 7.4, b: 6.2, line: 6.8 },
  { label: "Wed", a: 4.1, b: 3.8, line: 4.2 },
  { label: "Thu", a: 3.2, b: 2.1, line: 3.9 },
  { label: "Fri", a: 4.6, b: 7.8, line: 5.4 },
  { label: "Sat", a: 6.1, b: 3.4, line: 5.9 },
  { label: "Sun", a: 4.8, b: 4.2, line: 6.1 },
];

const ACTIVITY = [
  {
    id: "1",
    icon: FileText,
    title: "Script ready: “Why Banks Fail”",
    detail: "Money Mindset · awaiting your review",
    time: "2m",
    tone: "accent" as const,
  },
  {
    id: "2",
    icon: CheckCircle2,
    title: "Final render approved",
    detail: "Dark Histories · “The Lost Expedition”",
    time: "1h",
    tone: "success" as const,
  },
  {
    id: "3",
    icon: Film,
    title: "14 clips generated",
    detail: "Money Mindset · asset review open",
    time: "3h",
    tone: "lavender" as const,
  },
];

export default function StyleguidePage() {
  const [tab, setTab] = useState("realtime");
  const [smart, setSmart] = useState(true);
  const [night, setNight] = useState(false);

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Styleguide</h1>
        <p className="mt-1 text-sm text-muted">
          Every core component with sample data — the Phase 0 design
          checkpoint.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Stat cards
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Eye} label="Total Views" value="84.2K" delta="+12%" />
          <StatCard
            icon={ThumbsUp}
            label="Avg. CTR"
            value="6.8"
            unit="%"
            chip={{ label: "Normal", tone: "neutral" }}
          />
          <StatCard
            icon={DollarSign}
            label="Est. Revenue"
            value="$412"
            chip={{ label: "Active", tone: "success" }}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <CardTitle>Views per day</CardTitle>
            <PillTabs
              options={[
                { label: "Real-Time", value: "realtime" },
                { label: "History", value: "history" },
              ]}
              value={tab}
              onChange={setTab}
            />
          </div>
          <ComboChart data={CHART_DATA} />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle linkout>Monthly budget</CardTitle>
            <p className="mb-2 flex items-center gap-1.5 text-sm text-muted">
              <TrendingUp className="size-4 text-success" /> On track
            </p>
            <ProgressBar percent={76} />
          </Card>
          <Card className="flex flex-col items-center">
            <CardTitle linkout>Channel health</CardTitle>
            <SemicircleGauge percent={92}>
              <span className="text-3xl font-bold tabular-nums">92%</span>
              <span className="text-xs text-muted">Optimal</span>
            </SemicircleGauge>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Pipeline flow</CardTitle>
          <div className="overflow-x-auto pb-2">
            <FlowDiagram
              nodes={[
                { key: "ideas", label: "Ideas", icon: Lightbulb, count: 3 },
                { key: "script", label: "Script", icon: FileText, count: 1 },
                {
                  key: "assets",
                  label: "Assets",
                  icon: Film,
                  emphasis: true,
                  count: 2,
                },
                { key: "render", label: "Render", icon: Clapperboard },
                { key: "ready", label: "Ready", icon: Upload, count: 1 },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardTitle>Activity</CardTitle>
          <ActivityFeed items={ACTIVITY} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Control center</CardTitle>
          <div className="space-y-3">
            <ToggleRow
              label="Smart Optimization"
              description="QC agent pre-reviews every gate"
              checked={smart}
              onChange={setSmart}
            />
            <ToggleRow
              label="Autopilot mode"
              description="Auto-approve above confidence threshold"
              checked={night}
              onChange={setNight}
            />
          </div>
        </Card>

        <Card>
          <CardTitle>Status chips</CardTitle>
          <div className="flex flex-wrap gap-2">
            <StatusChip tone="success">Published</StatusChip>
            <StatusChip tone="warning">Awaiting review</StatusChip>
            <StatusChip tone="neutral">Draft</StatusChip>
            <StatusChip tone="coral">Needs revision</StatusChip>
            <StatusChip tone="lavender">Generating</StatusChip>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink shadow-card transition-transform hover:scale-[1.02]"
            >
              Approve
            </button>
            <button
              type="button"
              className="rounded-full bg-card px-5 py-2.5 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft"
            >
              Request revision
            </button>
            <button
              type="button"
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-card shadow-card"
            >
              Dark action
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

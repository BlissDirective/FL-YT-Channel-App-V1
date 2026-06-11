import {
  Clapperboard,
  FileText,
  Film,
  Lightbulb,
  Rocket,
  Sparkles,
  Upload,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { FlowDiagram } from "@/components/ui/flow-diagram";
import { StatCard } from "@/components/ui/stat-card";

export default function Home() {
  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome to Faceless Studio
        </h1>
        <p className="mt-1 text-sm text-muted">
          Phase 0 — foundation deployed. The project overview dashboard
          arrives in Phase 2.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Rocket}
          label="Build phase"
          value="0"
          unit="of 10"
          chip={{ label: "Active", tone: "success" }}
        />
        <StatCard
          icon={Sparkles}
          label="Design system"
          value="9"
          unit="components"
          delta="+9"
        />
        <StatCard
          icon={Clapperboard}
          label="Projects"
          value="0"
          unit="channels"
          chip={{ label: "Phase 1", tone: "neutral" }}
        />
      </div>

      <Card>
        <CardTitle>The production pipeline you&apos;ll be running</CardTitle>
        <div className="overflow-x-auto pb-2">
          <FlowDiagram
            nodes={[
              { key: "ideas", label: "Ideas", icon: Lightbulb },
              { key: "script", label: "Script", icon: FileText },
              { key: "assets", label: "Assets", icon: Film, emphasis: true },
              { key: "render", label: "Render", icon: Clapperboard },
              { key: "ready", label: "Ready", icon: Upload },
            ]}
          />
        </div>
        <p className="mt-3 text-sm text-muted">
          Browse the <a href="/styleguide" className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-2">styleguide</a>{" "}
          to validate the look and feel — this is the design checkpoint for
          Phase 0.
        </p>
      </Card>
    </div>
  );
}

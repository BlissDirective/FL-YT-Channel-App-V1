import { Radar } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getProjects, getVideoIntelList } from "@/lib/db/queries";
import { Card, CardTitle } from "@/components/ui/card";
import { IntelWorkspace } from "./intel-workspace";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function IntelPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; video?: string; topic?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="pt-2">
        <Card className="max-w-xl">
          <CardTitle>Market Intelligence</CardTitle>
          <p className="text-sm text-muted">Connect Supabase to run market scans.</p>
        </Card>
      </div>
    );
  }

  const sp = await searchParams;
  const [projects, history] = await Promise.all([
    getProjects(),
    getVideoIntelList({ limit: 20 }),
  ]);

  if (projects.length === 0) {
    return (
      <div className="space-y-6 pt-2">
        <Header />
        <Card>
          <p className="text-sm text-muted">
            Create a project first — market scans run against a project&apos;s niche.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <Header />
      <IntelWorkspace
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        initial={{ projectId: sp.project, videoId: sp.video, topic: sp.topic }}
        history={history}
      />
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Radar className="size-6 text-lavender" /> Market Intelligence
      </h1>
      <p className="mt-1 text-sm text-muted">
        Scan what works in the market for a topic, then turn it into our own
        original blueprint. Analysis only — everything we generate is 100% ours.
      </p>
    </div>
  );
}

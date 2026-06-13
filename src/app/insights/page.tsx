import { Lightbulb } from "lucide-react";
import { getInsights } from "@/lib/db/queries";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Card } from "@/components/ui/card";
import { RealtimeRefresher } from "@/components/dashboard/realtime-refresher";
import { GenerateInsightsButton, InsightCard } from "./insights-list";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="pt-2">
        <Card className="max-w-xl">
          <p className="text-sm text-muted">Connect Supabase to see insights.</p>
        </Card>
      </div>
    );
  }

  const insights = await getInsights();

  return (
    <div className="space-y-6 pt-2">
      <RealtimeRefresher tables={["insights"]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
          <p className="mt-1 text-sm text-muted">
            What&apos;s working across your channels — and one-tap prompt tuning
            from the weekly Optimizer.
          </p>
        </div>
        <GenerateInsightsButton />
      </div>

      {insights.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-3xl bg-accent-soft text-ink">
            <Lightbulb className="size-6" />
          </span>
          <div>
            <h3 className="font-semibold">No insights yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              The Optimizer correlates your tracked video stats into plain-English
              findings each week. Track at least two videos in a project, then tap
              <span className="font-medium text-ink"> Generate insights</span>.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {insights.map((i) => (
            <InsightCard key={i.id} insight={i} />
          ))}
        </div>
      )}
    </div>
  );
}

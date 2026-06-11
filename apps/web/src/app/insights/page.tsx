import { Card, CardTitle } from "@/components/ui/card";

export default function InsightsPage() {
  return (
    <div className="pt-2">
      <Card className="max-w-xl">
        <CardTitle>Insights</CardTitle>
        <p className="text-sm text-muted">
          Cross-project insights and Optimizer suggestions arrive in Phase 8.
        </p>
      </Card>
    </div>
  );
}

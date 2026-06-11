import { Card, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="pt-2">
      <Card className="max-w-xl">
        <CardTitle>Settings</CardTitle>
        <p className="text-sm text-muted">
          Global settings, credentials health, and the cost ledger arrive in
          Phases 1–3.
        </p>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getMockVoices } from "@/lib/adapters/voice";
import { ProjectWizard } from "./wizard";

export default async function NewProjectPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="pt-2 text-sm text-muted">
        Connect Supabase first — see Settings.
      </div>
    );
  }
  const voices = await getMockVoices();

  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-2">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Back to overview
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Project</h1>
        <p className="mt-1 text-sm text-muted">
          Set up an autonomous channel. You can change everything later in
          project settings.
        </p>
      </div>
      <ProjectWizard voices={voices} />
    </div>
  );
}

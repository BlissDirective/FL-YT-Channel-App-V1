import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProject } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import { getVoices } from "@/lib/adapters/voice";
import { DEFAULT_SCRIPT_TEMPLATE } from "@/lib/pipeline/templates";
import { SettingsForm } from "./settings-form";
import { TemplateEditor } from "./template-editor";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const supabase = await createClient();
  const voices = await getVoices();
  const { data: template } = await supabase
    .from("prompt_templates")
    .select("body, version")
    .eq("project_id", id)
    .eq("kind", "script")
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-2">
      <Link
        href={`/projects/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Back to project
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Project settings</h1>
        <p className="mt-1 text-sm text-muted">{project.name}</p>
      </div>
      <SettingsForm
        project={{ ...project, youtube_refresh_token: null }}
        hasYoutubeToken={Boolean(project.youtube_refresh_token)}
        voices={voices}
      />
      <TemplateEditor
        projectId={id}
        initialBody={template?.body ?? DEFAULT_SCRIPT_TEMPLATE}
        version={template?.version ?? 0}
        defaultBody={DEFAULT_SCRIPT_TEMPLATE}
      />
    </div>
  );
}

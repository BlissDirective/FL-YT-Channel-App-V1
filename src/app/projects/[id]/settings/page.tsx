import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProject } from "@/lib/db/queries";
import { SettingsForm } from "./settings-form";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

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
      <SettingsForm project={project} />
    </div>
  );
}

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/lib/db/types";
import { StatusChip } from "@/components/ui/status-chip";

export function ProjectCard({
  project,
  videoCount,
  inPipeline,
}: {
  project: Project;
  videoCount: number;
  inPipeline: number;
}) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col gap-4 rounded-card bg-card p-5 shadow-card transition-shadow hover:shadow-float"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{project.name}</h3>
          <p className="mt-0.5 text-xs text-muted">{project.niche || "No niche set"}</p>
        </div>
        <ArrowUpRight className="size-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>

      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <StatusChip tone={project.status === "active" ? "success" : "neutral"}>
              {project.status === "active" ? "Active" : "Paused"}
            </StatusChip>
            {project.is_demo && <StatusChip tone="lavender">Demo</StatusChip>}
          </div>
          <div className="flex gap-5 pt-1">
            <div>
              <p className="text-xl font-bold tabular-nums">{videoCount}</p>
              <p className="text-xs text-muted">videos</p>
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums">{inPipeline}</p>
              <p className="text-xs text-muted">in pipeline</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Read a project's pipeline_mode client-side for the nav (which lives in the
 * root layout, above any per-project server layout, so it can't get the mode
 * from context). One lightweight query per project, cached module-wide so
 * navigating between a project's tabs never refetches.
 */
const cache = new Map<string, "autonomous" | "director">();

export function usePipelineMode(projectId: string | null): "autonomous" | "director" | null {
  const [mode, setMode] = useState<"autonomous" | "director" | null>(
    projectId ? cache.get(projectId) ?? null : null,
  );

  useEffect(() => {
    if (!projectId) {
      setMode(null);
      return;
    }
    const cached = cache.get(projectId);
    if (cached) {
      setMode(cached);
      return;
    }
    let cancelled = false;
    createClient()
      .from("projects")
      .select("pipeline_mode")
      .eq("id", projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const m = (data as { pipeline_mode?: string } | null)?.pipeline_mode === "director"
          ? "director"
          : "autonomous";
        cache.set(projectId, m);
        setMode(m);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return mode;
}

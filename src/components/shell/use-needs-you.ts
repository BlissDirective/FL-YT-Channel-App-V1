"use client";

import { useEffect, useState } from "react";

/**
 * Live "needs you" count for the Feed nav badge (#6). The nav is in the root
 * layout (no per-project server layout), so it fetches the count from the small
 * count route. Cached module-wide + refreshed on focus so the badge stays live
 * without polling on a timer.
 */
const cache = new Map<string, number>();

export function useNeedsYouCount(projectId: string | null): number {
  const [count, setCount] = useState<number>(projectId ? cache.get(projectId) ?? 0 : 0);

  useEffect(() => {
    if (!projectId) {
      setCount(0);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/needs-you`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const { count: c } = (await res.json()) as { count: number };
        cache.set(projectId, c);
        if (!cancelled) setCount(c);
      } catch {
        /* best-effort badge */
      }
    };
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [projectId]);

  return count;
}

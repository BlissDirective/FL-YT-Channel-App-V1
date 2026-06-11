"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Refreshes the current server-rendered route whenever watched tables
    change — keeps dashboards live without client-side data fetching. */
export function RealtimeRefresher({
  tables = ["videos", "ideas", "projects"],
}: {
  tables?: string[];
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("dashboard-refresh");
    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => router.refresh(),
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, tables.join(",")]);

  return null;
}

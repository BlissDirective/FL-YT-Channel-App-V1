"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/** Global back control — hidden on the dashboard root where there is no
    "previous screen", and on login. */
export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/" || pathname === "/login") return null;

  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/");
      }}
      className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-ink shadow-card transition-colors hover:bg-accent-soft"
    >
      <ChevronLeft className="size-5" />
    </button>
  );
}

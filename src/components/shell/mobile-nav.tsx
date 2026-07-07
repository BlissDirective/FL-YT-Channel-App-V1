"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  globalNavV2,
  navIsActive,
  projectIdFromPath,
  projectNavV2,
  type NavItem,
} from "./nav-context";

/** Bottom tab bar for phones — the top nav pills are hidden below `sm`,
    so this is the only mobile route to everything. UI v2 (Phase 6): the tab
    set is context-aware — project tabs inside a project (with a Home tab to
    exit), global tabs elsewhere; the same IA as the desktop pills. */
export function MobileNav() {
  const pathname = usePathname();

  // The login screen renders its own centered layout; no nav chrome there.
  if (pathname === "/login") return null;

  const projectId = projectIdFromPath(pathname);
  const tabs: NavItem[] = projectId
    ? [{ label: "Home", href: "/", icon: Home }, ...projectNavV2(projectId)]
    : globalNavV2();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] shadow-float sm:hidden"
    >
      <div
        className={cn(
          "grid",
          // Global nav = 3 tabs (Home · Spend · Settings); project nav = 5
          // (Home + Library · Autopilot · Feed · Settings). Static classes so
          // Tailwind keeps them.
          { 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" }[tabs.length] ??
            "grid-cols-5",
        )}
      >
        {tabs.map((tab) => {
          const active = navIsActive(tab, pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                active ? "text-ink" : "text-muted",
              )}
            >
              <span
                className={cn(
                  "grid place-items-center rounded-full px-3 py-1 transition-colors",
                  active && "bg-accent-soft",
                )}
              >
                <tab.icon className="size-4" />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

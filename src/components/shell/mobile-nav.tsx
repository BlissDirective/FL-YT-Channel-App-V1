"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  Lightbulb,
  Radar,
  Settings,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  globalNavV2,
  isUiV2Client,
  navIsActive,
  projectIdFromPath,
  projectNavV2,
  type NavItem,
} from "./nav-context";

const TABS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Insights", href: "/insights", icon: Lightbulb },
  { label: "Intel", href: "/intel", icon: Radar },
  { label: "Spend", href: "/costs", icon: Wallet },
  { label: "Settings", href: "/settings", icon: Settings },
];

/** Bottom tab bar for phones — the top nav pills are hidden below `sm`,
    so this is the only mobile route to everything. UI v2 (Phase 6): the tab
    set is context-aware — project tabs inside a project (with a Home tab to
    exit), global tabs elsewhere; the same IA as the desktop pills. */
export function MobileNav() {
  const pathname = usePathname();

  // The login screen renders its own centered layout; no nav chrome there.
  if (pathname === "/login") return null;

  let tabs: (NavItem | (typeof TABS)[number])[] = TABS;
  let v2 = false;
  if (isUiV2Client()) {
    v2 = true;
    const projectId = projectIdFromPath(pathname);
    tabs = projectId
      ? [{ label: "Home", href: "/", icon: Home }, ...projectNavV2(projectId)]
      : globalNavV2();
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] shadow-float sm:hidden"
    >
      <div className={cn("grid", tabs.length === 4 ? "grid-cols-4" : "grid-cols-5")}>
        {tabs.map((tab) => {
          const active = v2
            ? navIsActive(tab as NavItem, pathname)
            : tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Lightbulb,
  Radar,
  Settings,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Insights", href: "/insights", icon: Lightbulb },
  { label: "Intel", href: "/intel", icon: Radar },
  { label: "Spend", href: "/costs", icon: Wallet },
  { label: "Settings", href: "/settings", icon: Settings },
];

/** Bottom tab bar for phones — the top nav pills are hidden below `sm`,
    so this is the only route to Insights/Intel/Spend on mobile. */
export function MobileNav() {
  const pathname = usePathname();

  // The login screen renders its own centered layout; no nav chrome there.
  if (pathname === "/login") return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] shadow-float sm:hidden"
    >
      <div className="grid grid-cols-5">
        {TABS.map((tab) => {
          const active =
            tab.href === "/"
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

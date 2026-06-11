"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, Settings, Sparkles } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "Insights", href: "/insights" },
  { label: "Styleguide", href: "/styleguide" },
];

export function TopNav() {
  const pathname = usePathname();

  // The login screen renders its own centered layout; no nav chrome there.
  if (pathname === "/login") return null;

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-5 sm:px-8">
      <Link href="/" className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-ink text-accent">
          <Sparkles className="size-5" fill="currentColor" />
        </span>
        <span className="text-lg font-bold tracking-tight">
          Faceless Studio
        </span>
      </Link>

      <nav className="hidden items-center gap-1 rounded-full bg-card-warm p-1 shadow-card sm:flex">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-card text-ink shadow-card"
                  : "text-muted hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="grid size-10 place-items-center rounded-full bg-card text-ink shadow-card transition-colors hover:bg-accent-soft"
        >
          <Bell className="size-4" />
        </button>
        <Link
          href="/settings"
          aria-label="Settings"
          className="grid size-10 place-items-center rounded-full bg-card text-ink shadow-card transition-colors hover:bg-accent-soft"
        >
          <Settings className="size-4" />
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            className="grid size-10 place-items-center rounded-full bg-card text-ink shadow-card transition-colors hover:bg-coral/15 hover:text-coral"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </header>
  );
}

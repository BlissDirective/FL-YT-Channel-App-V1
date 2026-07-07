"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings, Sparkles } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/cn";
import { BackButton } from "./back-button";
import {
  globalNavV2,
  navIsActive,
  projectIdFromPath,
  projectNavV2,
} from "./nav-context";

export function TopNav() {
  const pathname = usePathname();

  // The login screen renders its own centered layout; no nav chrome there.
  if (pathname === "/login") return null;

  // Two-level IA (Phase 6/7): project tabs inside a project, global tabs
  // elsewhere; the same sets the mobile bottom bar uses.
  const projectId = projectIdFromPath(pathname);
  const items = projectId ? projectNavV2(projectId) : globalNavV2();

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-5 sm:px-8">
      <div className="flex items-center gap-2">
        <BackButton />
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-ink text-accent">
            <Sparkles className="size-5" fill="currentColor" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            Faceless Studio
          </span>
        </Link>
      </div>

      <nav className="hidden items-center gap-1 rounded-full bg-card-warm p-1 shadow-card sm:flex">
        {items.map((item) => {
          const active = navIsActive(item, pathname);
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

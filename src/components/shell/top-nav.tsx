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
import { usePipelineMode } from "./use-pipeline-mode";
import { useNeedsYouCount } from "./use-needs-you";

export function TopNav() {
  const pathname = usePathname();
  const projectId = projectIdFromPath(pathname);
  const pipelineMode = usePipelineMode(projectId);
  const needsYou = useNeedsYouCount(projectId);

  // The login screen renders its own centered layout; no nav chrome there.
  if (pathname === "/login") return null;

  // Two-level IA (Phase 6/7): project tabs inside a project, global tabs
  // elsewhere; the same sets the mobile bottom bar uses.
  const items = projectId ? projectNavV2(projectId, pipelineMode, needsYou) : globalNavV2();

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-5 sm:px-8">
      <div className="flex items-center gap-2">
        <BackButton />
        <Link href="/" className="group flex items-center gap-3">
          <span className="relative grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-accent to-[#08b478] text-on-accent shadow-[0_0_18px_-4px_rgb(16_212_142/0.7)] transition-transform group-hover:scale-105">
            <Sparkles className="size-5" fill="currentColor" />
          </span>
          <span className="shiny-text font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
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
                "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-card text-ink shadow-card"
                  : "text-muted hover:text-ink",
              )}
            >
              {item.label}
              {item.badge ? (
                <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-on-accent">
                  {item.badge}
                </span>
              ) : null}
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

import Link from "next/link";

/**
 * Shared shell for the draft legal pages. Every page carries a visible DRAFT
 * banner — these are templates for lawyer review before public launch, not
 * final legal advice. Readable light-on-dark prose within the marketing theme.
 */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <Link href="/launch" className="text-xs text-[var(--m-muted)] hover:text-[var(--m-ink)]">
        ← Back to Faceless Studio
      </Link>

      <div className="mt-6 rounded-lg border border-[var(--m-amber)]/30 bg-[var(--m-amber)]/5 px-4 py-3 text-xs text-[var(--m-muted)]">
        <span className="font-semibold text-[var(--m-amber)]">DRAFT — for review.</span>{" "}
        This is a template pending legal review and is not yet a binding agreement
        or legal advice.
      </div>

      <h1 className="mt-8 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--m-ink)]">
        {title}
      </h1>
      <p className="mt-2 text-xs text-[var(--m-muted)]">Last updated: {updated}</p>

      <div className="legal-prose mt-8 space-y-5 text-sm leading-relaxed text-[var(--m-muted)]">
        {children}
      </div>
    </main>
  );
}

/** Small typographic helpers so the pages read consistently. */
export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="pt-3 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--m-ink)]">
      {children}
    </h2>
  );
}

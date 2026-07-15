import type { Metadata } from "next";
import {
  ShieldCheck,
  Coins,
  Workflow,
  Network,
  Clapperboard,
  AudioLines,
  Wand2,
  Brain,
  ArrowDown,
} from "lucide-react";
import { Reveal, WordReveal, CountUp, Aurora } from "@/components/bits/motion";
import { SpotlightCard, Magnetic } from "@/components/bits/interactive";
import { CaptureForm } from "./capture-form";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Faceless Studio — Full automation. Zero blind trust.",
};

/** The eight distinguishing systems — each an accurate, specific hook. */
const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Four gates and a judge",
    body: "IDEA, SCRIPT, CUT, and FINAL each need your green light — plus a vision judge that scores every frame before you ever see it. Nothing ships under the bar you set.",
    tag: "Quality control",
  },
  {
    icon: Coins,
    title: "Spends like a director",
    body: "A router picks the cheapest medium that still lands each beat — free motion-graphics and charts for explainers, premium generative video saved only for the beats that earn it.",
    tag: "Cost & asset tiers",
  },
  {
    icon: Workflow,
    title: "Idea to upload, on autopilot",
    body: "Research, script, voice, visuals, cut, and the publish kit run end-to-end from one brief — behind a mechanical kill switch that stops every paid action at once.",
    tag: "Agentic pipeline",
  },
  {
    icon: Network,
    title: "A crew, not a chatbot",
    body: "A cut agent, an art director, a frame critic, a beat-relevance checker, and a research librarian each own their craft — every move versioned, budgeted, and answerable to your gates.",
    tag: "Multi-agent orchestration",
  },
  {
    icon: Clapperboard,
    title: "You edit the same document the agent does",
    body: "A real timeline with version history — v3 compiler, v4 agent, v5 you. No export, no round-trip; your save is just the next version, and you can revert anything.",
    tag: "Editing",
  },
  {
    icon: AudioLines,
    title: "Narration that drives the cut",
    body: "Word-timestamped voiceover means captions, emphasis, and clip timing lock to the exact syllable the line is spoken — not a guess, and never drifting.",
    tag: "Voice",
  },
  {
    icon: Wand2,
    title: "Programmatic scenes, not stock filler",
    body: "Quote cards, stat tickers, comparisons, and kinetic captions are authored as code and composited over generative clips — crisp at any resolution, on-brand every time.",
    tag: "Special effects",
  },
  {
    icon: Brain,
    title: "It learns from your audience",
    body: "Every retention dip is traced to the exact cut that caused it. A lesson only graduates once your own data proves it — an internet tip can never outvote your channel.",
    tag: "Learning loops",
  },
] as const;

const STATS = [
  { to: 4, suffix: "", label: "quality gates in your hands" },
  { to: 7, suffix: "", label: "visual mediums, auto-routed per beat" },
  { to: 100, suffix: "%", label: "of edits versioned & revertible" },
  { to: 0, suffix: "", label: "videos published under your floor" },
] as const;

const FAQ = [
  {
    q: "Is this AI slop?",
    a: "That's exactly what the gate stack exists to prevent. A vision judge scores every cut against a floor you set, four checkpoints need a green light, and you can open and override any edit. Automation with a veto is the whole point.",
  },
  {
    q: "What do I still do?",
    a: "The judgment calls — the brand, the taste, and the veto at each gate. The crew handles the labor; you stay the director. You can run hands-on (approve every step) or let trusted stages run on their own.",
  },
  {
    q: "What does it cost to run?",
    a: "Per-video production lands in a coffee-tier range that depends on length and how much premium video each script earns — enforced by ledgers and hard caps in code, not by hope. Exact pricing and plans go to the list first.",
  },
  {
    q: "Is this affiliated with YouTube?",
    a: "No. Faceless Studio is an independent tool and is not affiliated with, endorsed by, or sponsored by YouTube or Google. Uploads stay under your own account and your control.",
  },
  {
    q: "When does it launch?",
    a: "Soon — and the list hears the date first, with founding-operator pricing locked in. Join below.",
  },
] as const;

export default function LaunchPage() {
  return (
    <main className="relative overflow-clip">
      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center px-5 pb-16 pt-24 text-center">
        <Aurora />
        <div className="relative z-10 mx-auto max-w-4xl">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--m-line)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--m-muted)]">
              <span className="size-1.5 rounded-full bg-[var(--m-amber)]" />
              Faceless Studio — Pre-launch
            </span>
          </Reveal>

          {/* Primary tagline (#3) — Space Grotesk, largest */}
          <h1
            className="mt-6 font-[family-name:var(--font-display)] text-[clamp(2.75rem,9vw,6rem)] font-bold leading-[0.95] tracking-[-0.02em] text-[var(--m-ink)]"
          >
            <WordReveal text="Full automation." />
            <br />
            <WordReveal text="Zero blind trust." startDelay={260} wordClassName="m-gradient-text" />
          </h1>

          {/* Secondary tagline (#10) — Sora, smaller, different face */}
          <Reveal delay={520}>
            <p className="mx-auto mt-6 max-w-2xl font-[family-name:var(--font-display-alt)] text-[clamp(1rem,2.4vw,1.4rem)] font-light leading-snug text-[var(--m-muted)]">
              Script, voice, visuals, effects, and the final cut — one brief, one
              crew, your call on every gate.
            </p>
          </Reveal>

          <Reveal delay={640} className="mx-auto mt-8 max-w-xl">
            <CaptureForm source="hero" size="lg" />
          </Reveal>
        </div>

        <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-[var(--m-muted)]">
          <span className="flex flex-col items-center gap-1 text-[11px] uppercase tracking-[0.14em]">
            Watch it work
            <ArrowDown className="size-4 animate-bounce" />
          </span>
        </div>
      </section>

      <div className="m-ticks mx-auto max-w-5xl" />

      {/* ── 2. Feature showcase ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--m-amber)]">
            What makes it different
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-tight text-[var(--m-ink)]">
            Eight systems most tools don&apos;t have
          </h2>
          <p className="mt-3 text-[var(--m-muted)]">
            Every claim below is backed by a system that exists — a gate, a cap, a
            version number. Not magic. Machinery.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 4) * 80}>
              <SpotlightCard className="group h-full p-5">
                <f.icon className="size-6 text-[var(--m-amber)]" strokeWidth={1.75} />
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--m-muted)]">
                  {f.tag}
                </p>
                <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-[var(--m-ink)]">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--m-muted)]">
                  {f.body}
                </p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 3. Stat band ────────────────────────────────────────────────── */}
      <section className="border-y border-[var(--m-line)] bg-black/30 px-5 py-16">
        <div className="mx-auto grid max-w-5xl gap-8 text-center sm:grid-cols-4">
          {STATS.map((s) => (
            <Reveal key={s.label}>
              <div className="font-[family-name:var(--font-display)] text-[clamp(2.5rem,6vw,3.5rem)] font-bold text-[var(--m-ink)]">
                <CountUp to={s.to} suffix={s.suffix} />
              </div>
              <p className="mt-2 text-sm text-[var(--m-muted)]">{s.label}</p>
            </Reveal>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-[var(--m-muted)]">
          Costs are enforced by ledgers and hard caps in code, not by hope. Exact
          per-video pricing and plans go to the list first.
        </p>
      </section>

      {/* ── 4. Mid capture ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-2xl px-5 py-20 text-center">
        <Reveal>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,4vw,2.4rem)] font-bold text-[var(--m-ink)]">
            See it on your niche.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[var(--m-muted)]">
            Join the launch list and get early access the day it opens.
          </p>
          <div className="mx-auto mt-6 max-w-lg">
            <CaptureForm source="mid" />
          </div>
        </Reveal>
      </section>

      <div className="m-ticks mx-auto max-w-5xl" />

      {/* ── 5. Founder note + FAQ ───────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-5 py-20">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--m-amber)]">
            Why we built it
          </p>
          <p className="mt-4 font-[family-name:var(--font-display-alt)] text-lg font-light leading-relaxed text-[var(--m-ink)]">
            Faceless channels deserve a real production system — not a slot machine
            that spits out clips and hopes. So we built the studio we wanted: a crew
            of agents that does the labor, a stack of gates that keeps the taste
            yours, and a ledger that never lies about what a video costs.
          </p>
        </Reveal>

        <div className="mt-12 space-y-3">
          {FAQ.map((item) => (
            <Reveal key={item.q}>
              <details className="group rounded-xl border border-[var(--m-line)] bg-[var(--m-card)] px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[var(--m-ink)] [&::-webkit-details-marker]:hidden">
                  <span className="font-medium">{item.q}</span>
                  <span className="ml-4 text-[var(--m-muted)] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[var(--m-muted)]">
                  {item.a}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 6. Final capture ────────────────────────────────────────────── */}
      <section className="relative px-5 py-24 text-center">
        <Aurora />
        <div className="relative z-10 mx-auto max-w-2xl">
          <Reveal>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(2rem,5vw,3.25rem)] font-bold leading-tight text-[var(--m-ink)]">
              The first operators set the price forever.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[var(--m-muted)]">
              Full automation. Zero blind trust. Get in before the doors open.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="m-star-border mx-auto mt-8 max-w-lg p-5">
              <CaptureForm source="final" size="lg" />
            </div>
          </Reveal>
          <Reveal delay={200} className="mt-8">
            <Magnetic>
              <a
                href="#top"
                className="inline-block text-sm font-medium text-[var(--m-muted)] transition-colors hover:text-[var(--m-ink)]"
              >
                Back to top ↑
              </a>
            </Magnetic>
          </Reveal>
        </div>
      </section>

      {/* ── Footer: legal, disclaimer, discreet operator login ──────────── */}
      <footer className="border-t border-[var(--m-line)] px-5 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center">
          <p className="max-w-2xl text-xs leading-relaxed text-[var(--m-muted)]">
            Faceless Studio is an independent product and is{" "}
            <span className="text-[var(--m-ink)]">
              not affiliated with, endorsed by, or sponsored by YouTube or Google
            </span>
            . All product names and logos are the property of their respective
            owners.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[var(--m-muted)]">
            <a href="/legal/privacy" className="hover:text-[var(--m-ink)]">
              Privacy
            </a>
            <a href="/legal/terms" className="hover:text-[var(--m-ink)]">
              Terms
            </a>
            <a href="/legal/disclaimer" className="hover:text-[var(--m-ink)]">
              Disclaimer
            </a>
            <a href="/legal/ai-disclosure" className="hover:text-[var(--m-ink)]">
              AI disclosure
            </a>
          </nav>
          <p className="text-[11px] text-[var(--m-muted)]/70">
            © {new Date().getFullYear()} Faceless Studio ·{" "}
            <a href="/login" className="underline underline-offset-2 hover:text-[var(--m-ink)]">
              Operator login
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}

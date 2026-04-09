import Link from "next/link";
import { ArrowRight, BadgeHelp, Bot, GraduationCap, Headset, LayoutDashboard } from "lucide-react";
import { AuthPanel } from "./components/AuthPanel";
import { RoleSwitcher } from "./components/RoleSwitcher";
import { SupportLauncher } from "./components/SupportLauncher";

const FEATURE_CARDS = [
  {
    title: "Learner self-service",
    text: "Handle portal login, missing classes, payment receipts, and certificate requests through an AI-first support flow.",
    icon: Bot,
  },
  {
    title: "Human resolution queue",
    text: "Escalated learner issues route into a severity-first support console for human agents.",
    icon: Headset,
  },
  {
    title: "Operational visibility",
    text: "Admins can track queue health, CSAT, escalations, and agent performance from a separate KPI dashboard.",
    icon: LayoutDashboard,
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-text">
      <header className="border-b border-border bg-surface/90 px-4 py-4 backdrop-blur-sm md:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="glow-accent flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent-light">
              <GraduationCap size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-subtle">skl8 support</p>
              <h1 className="truncate text-base font-semibold sm:text-lg">skl8</h1>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <RoleSwitcher />
            <Link href="/support" className="rounded-xl bg-accent px-4 py-2 text-center text-sm text-white transition-all hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">Open full support</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl gap-8 px-4 py-8 md:px-6 md:py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-10">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs text-accent-light">
            <BadgeHelp size={12} />
            Demo mode plus Supabase-backed auth and data
          </div>
          <h2 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
            Training-center support built for learners, human agents, and operations teams.
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-subtle sm:text-base sm:leading-8">
            Learners can launch support from the bottom-right widget or a full support page. Human agents work escalated issues in a filtered queue, and admins monitor response time, resolution quality, escalations, and team workload.
          </p>
          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
            <Link href="/support" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm text-white transition-all hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
              Explore learner support
              <ArrowRight size={14} />
            </Link>
            <Link href="/support/agent" className="rounded-2xl border border-border bg-card px-5 py-3 text-center text-sm text-text transition-all hover:border-accent/30 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
              Open agent queue
            </Link>
            <Link href="/support/admin" className="rounded-2xl border border-border bg-card px-5 py-3 text-center text-sm text-text transition-all hover:border-accent/30 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
              Open admin KPIs
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:mt-10">
            {FEATURE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent-light">
                    <Icon size={18} />
                  </div>
                  <h3 className="text-lg font-semibold">{card.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-subtle">{card.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section>
          <AuthPanel />
        </section>
      </main>

      <SupportLauncher />
    </div>
  );
}

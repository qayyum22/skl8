import Link from "next/link";
import { ArrowRight, Bot, GraduationCap, ShieldCheck } from "lucide-react";
import { AuthPanel } from "./components/AuthPanel";
import { SupportLauncher } from "./components/SupportLauncher";
import { Navbar } from "./components/Navbar";

const QUICK_LINKS = [
  { label: "Student support", href: "/support" },
  { label: "Human agent queue", href: "/support/agent" },
  { label: "Admin dashboard", href: "/support/admin" },
] as const;

export default function Home() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#f6f2ea] text-stone-900">
      <Navbar />

      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 overflow-hidden px-4 py-4 md:px-6 md:py-6">
        <div className="grid min-h-0 w-full gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="min-h-0 overflow-y-auto rounded-[32px] border border-stone-200 bg-[radial-gradient(circle_at_top_left,_rgba(197,164,126,0.18),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,244,237,0.96))] p-6 shadow-[0_20px_70px_rgba(75,55,34,0.08)] sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-stone-500">
              <ShieldCheck size={12} />
              Minimal support workspace
            </div>

            <div className="mt-8 max-w-2xl">
              <h1 className="text-4xl font-semibold leading-tight tracking-[-0.04em] text-stone-900 sm:text-5xl md:text-6xl">
                Quiet, fast support for students and staff.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-stone-600 sm:text-base sm:leading-8">
                A single support flow for student questions, human agent follow-up, and admin visibility. Clean by default, ready for real conversations.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/support"
                className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
              >
                Open support
                <ArrowRight size={14} />
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/80 px-4 py-3 text-sm text-stone-600">
                <Bot size={14} />
                AI + human handoff
              </div>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {QUICK_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[24px] border border-stone-200 bg-white/88 px-4 py-4 text-sm text-stone-700 transition-all hover:border-stone-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  <p className="font-medium text-stone-900">{item.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">Open</p>
                </Link>
              ))}
            </div>

            <div className="mt-10 rounded-[28px] border border-stone-200 bg-white/82 p-5 sm:p-6">
              <div className="flex items-center gap-3 text-stone-900">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#efe4d4] text-stone-700">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium">Built for clarity</p>
                  <p className="text-sm text-stone-600">No dashboard overload on the first screen. Just the actions people need.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="min-h-0 overflow-y-auto rounded-[32px] border border-stone-200 bg-white/90 p-2 shadow-[0_20px_70px_rgba(75,55,34,0.08)]">
            <AuthPanel />
          </section>
        </div>
      </main>

      <SupportLauncher />
    </div>
  );
}

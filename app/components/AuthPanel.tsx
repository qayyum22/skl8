"use client";

import { AlertCircle, Database, KeyRound, Loader2, LogIn, LogOut, ShieldCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppRole } from "@/types";
import { useAppAuth } from "@/hooks/useAppAuth";

const DEMO_CREDENTIALS = [
  { label: "Customer demo", email: "ava.learner@skl8.demo", password: "Password123!", role: "customer" },
  { label: "Agent demo", email: "jordan.agent@skl8.demo", password: "Password123!", role: "agent" },
  { label: "Admin demo", email: "priya.admin@skl8.demo", password: "Password123!", role: "admin" },
] as const;

function getDashboardPath(role: AppRole) {
  switch (role) {
    case "admin":
      return "/support/admin";
    case "agent":
      return "/support/agent";
    default:
      return "/support";
  }
}

export function AuthPanel() {
  const router = useRouter();
  const { backendAvailable, authBusy, mode, ready, signIn, signOut, signUp, user } = useAppAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("Ava Learner");
  const [email, setEmail] = useState("ava@example.com");
  const [password, setPassword] = useState("password123");
  const [status, setStatus] = useState<{ tone: "neutral" | "error" | "success"; message: string } | null>(null);

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const result = await signIn(email, password);
    if (result.error) {
      setStatus({ tone: "error", message: result.error });
      return;
    }
    setStatus({ tone: "success", message: "Signed in with Supabase successfully. Redirecting..." });
    router.push(getDashboardPath(result.user?.role ?? "customer"));
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const result = await signUp(name, email, password);
    if (result.error) {
      setStatus({ tone: "error", message: result.error });
      return;
    }
    setStatus({ tone: "success", message: result.message || "Account created." });
    if (result.user) {
      router.push(getDashboardPath(result.user.role));
    }
  };

  const handleSignOut = async () => {
    setStatus(null);
    await signOut();
    router.push("/");
    router.refresh();
    setStatus({ tone: "neutral", message: "Signed out successfully." });
  };

  const fillDemoCredentials = (demo: (typeof DEMO_CREDENTIALS)[number]) => {
    setTab("signin");
    setEmail(demo.email);
    setPassword(demo.password);
    setStatus({ tone: "neutral", message: `${demo.label} credentials loaded. Click sign in to continue.` });
  };

  const statusClass =
    status?.tone === "error"
      ? "border-danger/25 bg-danger/10 text-danger"
      : status?.tone === "success"
        ? "border-success/25 bg-success/10 text-success"
        : "border-border bg-surface/70 text-subtle";

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-subtle">Auth</p>
          <h3 className="mt-1 text-xl font-semibold text-text">Supabase access</h3>
          <p className="mt-2 text-sm leading-6 text-subtle">
            Keep demo mode for mock role switching, or sign in with Supabase to use real Postgres-backed sessions and role-based access.
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-wide ${backendAvailable ? "border-success/25 bg-success/10 text-success" : "border-warning/25 bg-warning/10 text-warning"}`}>
          <Database size={12} />
          {backendAvailable ? "Backend ready" : "Demo only"}
        </div>
      </div>

      {!ready ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-subtle">
          <Loader2 size={15} className="animate-spin" />
          Checking auth state...
        </div>
      ) : mode === "supabase" ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-border bg-surface/70 p-4">
            <div className="flex items-center gap-2 text-accent-light">
              <ShieldCheck size={16} />
              <p className="text-sm font-medium text-text">Signed in as {user.name}</p>
            </div>
            <p className="mt-2 text-sm text-subtle">{user.email}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-subtle">Role: {user.role}</p>
            <p className="mt-3 text-xs leading-5 text-subtle">
              Customer is the default Supabase role. Promote agent and admin users by updating the `profiles.role` value in Postgres.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={authBusy}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text transition-all hover:border-accent/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-60"
          >
            {authBusy ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            Sign out
          </button>
        </div>
      ) : backendAvailable ? (
        <div className="mt-5 space-y-4">
          <div className="inline-flex rounded-2xl border border-border bg-surface/80 p-1 text-xs text-subtle">
            <button
              type="button"
              onClick={() => setTab("signin")}
              className={`rounded-xl px-3 py-2 transition-all ${tab === "signin" ? "bg-card text-text shadow-sm" : "hover:text-text"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setTab("signup")}
              className={`rounded-xl px-3 py-2 transition-all ${tab === "signup" ? "bg-card text-text shadow-sm" : "hover:text-text"}`}
            >
              Create account
            </button>
          </div>

          {tab === "signin" ? (
            <>
              <form className="space-y-3" onSubmit={handleSignIn}>
                <label className="block text-sm text-subtle">
                  Email
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20" required />
                </label>
                <label className="block text-sm text-subtle">
                  Password
                  <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20" required />
                </label>
                <button type="submit" disabled={authBusy} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm text-white transition-all hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-60">
                  {authBusy ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                  Sign in with Supabase
                </button>
              </form>

              <div className="rounded-2xl border border-border bg-surface/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">Demo credentials</p>
                <p className="mt-2 text-sm leading-6 text-subtle">
                  This is a demo build. Use one of the seeded accounts below to sign in quickly.
                </p>
                <div className="mt-3 space-y-2">
                  {DEMO_CREDENTIALS.map((demo) => (
                    <button
                      key={demo.email}
                      type="button"
                      onClick={() => fillDemoCredentials(demo)}
                      className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left transition-all hover:border-accent/30 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-text">{demo.label}</span>
                        <span className="text-[11px] uppercase tracking-wide text-subtle">{demo.role}</span>
                      </div>
                      <p className="mt-1 text-sm text-subtle">{demo.email}</p>
                      <p className="mt-1 text-xs text-subtle">Password: {demo.password}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <form className="space-y-3" onSubmit={handleSignUp}>
              <label className="block text-sm text-subtle">
                Full name
                <input value={name} onChange={(event) => setName(event.target.value)} type="text" className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20" required />
              </label>
              <label className="block text-sm text-subtle">
                Email
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20" required />
              </label>
              <label className="block text-sm text-subtle">
                Password
                <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20" required minLength={8} />
              </label>
              <button type="submit" disabled={authBusy} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm text-white transition-all hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-60">
                {authBusy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Create customer account
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-warning/20 bg-warning/10 p-4 text-sm text-subtle">
          <div className="flex items-center gap-2 text-warning">
            <AlertCircle size={16} />
            Supabase is not configured yet.
          </div>
          <p className="mt-2 leading-6">
            Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to enable sign-in, sign-up, and Postgres-backed support data. Until then, the existing mock workflow remains available.
          </p>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-border bg-surface/60 p-4">
        <div className="flex items-center gap-2 text-subtle">
          <KeyRound size={15} />
          <p className="text-sm font-medium text-text">How roles work</p>
        </div>
        <p className="mt-2 text-sm leading-6 text-subtle">
          Demo mode still supports mock role switching. In Supabase mode, new users sign up as customers by default. Promote staff accounts to `agent` or `admin` by updating the `profiles` table in Postgres.
        </p>
      </div>

      {status && <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${statusClass}`}>{status.message}</div>}
    </section>
  );
}

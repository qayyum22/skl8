"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Loader2, LogIn, LogOut, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppRole } from "@/types";
import { useAppAuth } from "@/hooks/useAppAuth";
import { getRoleLabel } from "@/app/lib/role-labels";

const DEMO_CREDENTIALS = [
  { label: "Student", email: "ava.learner@skl8.demo", password: "Password123!", role: "customer" },
  { label: "Human Agent", email: "jordan.agent@skl8.demo", password: "Password123!", role: "agent" },
  { label: "Admin", email: "priya.admin@skl8.demo", password: "Password123!", role: "admin" },
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
    setStatus({ tone: "success", message: "Signed in successfully. Redirecting..." });
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
  };

  const fillDemoCredentials = (demo: (typeof DEMO_CREDENTIALS)[number]) => {
    setTab("signin");
    setEmail(demo.email);
    setPassword(demo.password);
    setStatus({ tone: "neutral", message: `${demo.label} credentials loaded.` });
  };

  const statusClass =
    status?.tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : status?.tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-stone-200 bg-stone-50 text-stone-600";

  return (
    <section className="rounded-[30px] bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500">Access</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-stone-900">Sign in quietly.</h2>
        </div>
        <div className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${backendAvailable ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {backendAvailable ? "Backend ready" : "Demo mode"}
        </div>
      </div>

      {!ready ? (
        <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-stone-500">
          <Loader2 size={16} className="animate-spin" />
          Checking auth state...
        </div>
      ) : mode === "supabase" ? (
        <div className="space-y-5 py-6">
          <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center gap-2 text-stone-900">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <p className="text-sm font-medium">Signed in as {user.name}</p>
            </div>
            <p className="mt-3 text-sm text-stone-600">{user.email}</p>
            <p className="mt-1 text-sm text-stone-500">{getRoleLabel(user.role)}</p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={authBusy}
            className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 transition-all hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:opacity-60"
          >
            {authBusy ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            Sign out
          </button>
        </div>
      ) : (
        <div className="py-6">
          <div className="inline-flex rounded-full bg-stone-100 p-1 text-sm text-stone-600">
            <button
              type="button"
              onClick={() => setTab("signin")}
              className={`rounded-full px-4 py-2 transition-all ${tab === "signin" ? "bg-white text-stone-900 shadow-sm" : "hover:text-stone-900"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setTab("signup")}
              className={`rounded-full px-4 py-2 transition-all ${tab === "signup" ? "bg-white text-stone-900 shadow-sm" : "hover:text-stone-900"}`}
            >
              Create account
            </button>
          </div>

          {backendAvailable ? (
            <div className="mt-5 space-y-5">
              {tab === "signin" ? (
                <form className="space-y-3" onSubmit={handleSignIn}>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    placeholder="Email"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
                    required
                  />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    placeholder="Password"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
                    required
                  />
                  <button
                    type="submit"
                    disabled={authBusy}
                    className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:opacity-60"
                  >
                    {authBusy ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                    Continue
                  </button>
                </form>
              ) : (
                <form className="space-y-3" onSubmit={handleSignUp}>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    type="text"
                    placeholder="Full name"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
                    required
                  />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    placeholder="Email"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
                    required
                  />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    placeholder="Password"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
                    required
                    minLength={8}
                  />
                  <button
                    type="submit"
                    disabled={authBusy}
                    className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:opacity-60"
                  >
                    {authBusy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    Create student account
                  </button>
                </form>
              )}

              <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Demo accounts</p>
                <div className="mt-3 space-y-2">
                  {DEMO_CREDENTIALS.map((demo) => (
                    <button
                      key={demo.email}
                      type="button"
                      onClick={() => fillDemoCredentials(demo)}
                      className="flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left transition-all hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                    >
                      <div>
                        <p className="text-sm font-medium text-stone-900">{demo.label}</p>
                        <p className="text-sm text-stone-500">{demo.email}</p>
                      </div>
                      <ArrowRight size={14} className="text-stone-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                Supabase is not configured yet.
              </div>
            </div>
          )}
        </div>
      )}

      {status && <div className={`rounded-2xl border px-4 py-3 text-sm ${statusClass}`}>{status.message}</div>}
    </section>
  );
}

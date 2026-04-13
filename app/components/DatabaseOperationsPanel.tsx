"use client";

import { useState } from "react";
import { Database, Loader2, RefreshCcw, Trash2, UploadCloud } from "lucide-react";
import { useAppAuth } from "@/hooks/useAppAuth";

interface DatabaseSnapshot {
  counts: {
    profiles: number;
    sessions: number;
  };
  recentProfiles: Array<{ id: string; full_name: string | null; role: string; created_at: string }>;
  recentSessions: Array<{ id: string; title: string; updated_at: string }>;
}

interface Props {
  sessionCount: number;
  onRefreshSessions: () => Promise<void>;
}

export function DatabaseOperationsPanel({ sessionCount, onRefreshSessions }: Props) {
  const { backendAvailable, mode } = useAppAuth();
  const [snapshot, setSnapshot] = useState<DatabaseSnapshot | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"refresh" | "seed" | "clear" | null>(null);

  const loadSnapshot = async () => {
    if (!backendAvailable || mode !== "supabase") {
      setSnapshot(null);
      return;
    }

    setBusyAction("refresh");
    setStatus(null);
    try {
      const response = await fetch("/api/admin/db", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error || "Unable to load database stats.");
        return;
      }
      setSnapshot(payload as DatabaseSnapshot);
      setStatus("Loaded latest Postgres snapshot.");
    } catch {
      setStatus("Unable to reach the database operations endpoint.");
    } finally {
      setBusyAction(null);
    }
  };

  const runAction = async (action: "seed_sessions" | "clear_sessions") => {
    setBusyAction(action === "seed_sessions" ? "seed" : "clear");
    setStatus(null);
    try {
      const response = await fetch("/api/admin/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error || "Database action failed.");
        return;
      }
      setStatus(payload.message || "Database operation completed.");
      await Promise.all([onRefreshSessions(), loadSnapshot()]);
    } catch {
      setStatus("Database operation failed unexpectedly.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-subtle">Database Ops</p>
          <h2 className="mt-1 text-lg font-semibold text-text">Supabase and Postgres controls</h2>
          <p className="mt-2 text-sm leading-6 text-subtle">
            Inspect backend connectivity, review recent records, and run basic support-data operations without losing demo mode.
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-wide ${backendAvailable ? "border-success/25 bg-success/10 text-success" : "border-warning/25 bg-warning/10 text-warning"}`}>
          <Database size={12} />
          {backendAvailable && mode === "supabase" ? "Postgres active" : "Demo fallback"}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <p className="text-xs uppercase tracking-wide text-subtle">Client sessions</p>
          <p className="mt-2 text-2xl font-semibold text-text">{sessionCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <p className="text-xs uppercase tracking-wide text-subtle">DB profiles</p>
          <p className="mt-2 text-2xl font-semibold text-text">{snapshot?.counts.profiles ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <p className="text-xs uppercase tracking-wide text-subtle">DB sessions</p>
          <p className="mt-2 text-2xl font-semibold text-text">{snapshot?.counts.sessions ?? "-"}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => void loadSnapshot()}
          disabled={busyAction !== null || !backendAvailable || mode !== "supabase"}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text transition-all hover:border-accent/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50"
        >
          {busyAction === "refresh" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          Load DB stats
        </button>
        <button
          type="button"
          onClick={() => void runAction("seed_sessions")}
          disabled={busyAction !== null || !backendAvailable || mode !== "supabase"}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text transition-all hover:border-accent/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50"
        >
          {busyAction === "seed" ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
          Seed support data
        </button>
        <button
          type="button"
          onClick={() => void runAction("clear_sessions")}
          disabled={busyAction !== null || !backendAvailable || mode !== "supabase"}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 disabled:opacity-50"
        >
          {busyAction === "clear" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Clear DB sessions
        </button>
      </div>

      {!backendAvailable || mode !== "supabase" ? (
        <div className="mt-4 rounded-2xl border border-warning/20 bg-warning/10 p-4 text-sm leading-6 text-subtle">
          Supabase auth is not active in this session yet. The mock role flow still works, but database actions stay disabled until a Supabase-backed session is active.
        </div>
      ) : null}

      {status ? <div className="mt-4 rounded-2xl border border-border bg-surface/70 px-4 py-3 text-sm text-subtle">{status}</div> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <p className="text-sm font-medium text-text">Recent profiles</p>
          <div className="mt-3 space-y-2">
            {snapshot?.recentProfiles?.length ? snapshot.recentProfiles.map((profile) => (
              <div key={profile.id} className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-subtle">
                <p className="font-medium text-text">{profile.full_name || profile.id}</p>
                <p className="text-xs uppercase tracking-wide">{profile.role}</p>
              </div>
            )) : <p className="text-sm text-subtle">Load DB stats to inspect recent profiles.</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <p className="text-sm font-medium text-text">Recent support sessions</p>
          <div className="mt-3 space-y-2">
            {snapshot?.recentSessions?.length ? snapshot.recentSessions.map((session) => (
              <div key={session.id} className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-subtle">
                <p className="font-medium text-text">{session.title}</p>
                <p className="text-xs">{new Date(session.updated_at).toLocaleString()}</p>
              </div>
            )) : <p className="text-sm text-subtle">Load DB stats to inspect recent sessions.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

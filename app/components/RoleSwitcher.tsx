"use client";

import { GraduationCap, LogOut } from "lucide-react";
import { useAppAuth } from "@/hooks/useAppAuth";

export function RoleSwitcher() {
  const { user, availableUsers, switchUser, mode, signOut, authBusy } = useAppAuth();

  if (mode === "supabase") {
    return (
      <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-xs text-subtle shadow-sm">
        <GraduationCap size={14} className="text-accent-light" />
        <span>Signed in as</span>
        <span className="text-sm font-medium text-text">{user.name}</span>
        <span className="text-[11px] uppercase tracking-wide text-subtle">{user.role}</span>
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={authBusy}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-[11px] text-text transition-all hover:border-accent/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-60"
        >
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <label className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-xs text-subtle shadow-sm">
      <GraduationCap size={14} className="text-accent-light" />
      Demo role
      <select
        value={user.id}
        onChange={(event) => switchUser(event.target.value)}
        className="bg-transparent text-sm text-text focus:outline-none"
      >
        {availableUsers.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.name} ({candidate.role})
          </option>
        ))}
      </select>
    </label>
  );
}

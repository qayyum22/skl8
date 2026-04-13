"use client";

import { GraduationCap, Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppAuth } from "@/hooks/useAppAuth";
import { getRoleLabel } from "@/app/lib/role-labels";

interface Props {
  compact?: boolean;
}

export function AuthStatus({ compact = false }: Props) {
  const router = useRouter();
  const { mode, user, signOut, authBusy } = useAppAuth();

  if (mode !== "supabase") {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-2xl border border-border bg-card text-subtle shadow-sm ${compact ? "px-2.5 py-2 text-[11px]" : "px-3 py-2 text-xs"}`}>
      <GraduationCap size={compact ? 12 : 14} className="text-accent-light" />
      <span className="hidden sm:inline">{user.name}</span>
      <span className="text-[10px] uppercase tracking-wide">{getRoleLabel(user.role)}</span>
      <button
        type="button"
        onClick={() => {
            void signOut().then(() => {
              router.push("/");
              router.refresh();
            });
          }}
        disabled={authBusy}
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-[11px] text-text transition-all hover:border-accent/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
      >
        {authBusy ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
        <span>Sign out</span>
      </button>
    </div>
  );
}

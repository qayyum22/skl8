"use client";

import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import type { AppRole } from "@/types";
import { useAppAuth } from "@/hooks/useAppAuth";
import { getRoleLabel } from "@/app/lib/role-labels";

interface Props {
  allowedRole: AppRole;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AccessGate({ allowedRole, title, description, children }: Props) {
  const { ready, user, switchRole, mode } = useAppAuth();
  const hasAccess = user.role === allowedRole || (allowedRole === "agent" && user.role === "admin");

  if (!ready) {
    return <div className="flex min-h-[50vh] items-center justify-center text-subtle">Loading access...</div>;
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent-light">
            <Lock size={22} />
          </div>
          <h1 className="text-2xl font-semibold text-text">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-subtle">{description}</p>
          <p className="mt-3 text-sm text-subtle">
            Signed in as <span className="font-medium text-text">{user.name}</span> ({getRoleLabel(user.role)}).
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {mode === "demo" && (
              <button
                type="button"
                onClick={() => switchRole(allowedRole)}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm text-white transition-all hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <ShieldCheck size={14} />
                Switch to {getRoleLabel(allowedRole)}
              </button>
            )}
            <Link
              href="/support"
              className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text transition-all hover:border-accent/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              Go to learner support
            </Link>
          </div>
          {mode === "supabase" && (
            <p className="mt-4 text-xs text-subtle">
              Update the signed-in user&apos;s role in the `profiles` table to grant access.
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

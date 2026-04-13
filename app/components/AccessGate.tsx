"use client";

import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import type { AppRole } from "@/types";
import { useAppAuth } from "@/hooks/useAppAuth";
import { getRoleLabel } from "@/app/lib/role-labels";
import { Navbar } from "./Navbar";

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
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-[#f6f2ea] text-stone-900">
        <Navbar showSupportLink={false} />
        <div className="flex flex-1 items-center justify-center text-sm text-stone-500">Loading access...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-[#f6f2ea] text-stone-900">
        <Navbar showSupportLink={false} />
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-xl rounded-[32px] border border-stone-200 bg-white p-8 text-center shadow-[0_20px_70px_rgba(75,55,34,0.08)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
              <Lock size={22} />
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-stone-900">{title}</h1>
            <p className="mt-3 text-sm leading-7 text-stone-600">{description}</p>
            <p className="mt-3 text-sm text-stone-500">
              Signed in as <span className="font-medium text-stone-900">{user.name}</span> ({getRoleLabel(user.role)}).
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {mode === "demo" && (
                <button
                  type="button"
                  onClick={() => switchRole(allowedRole)}
                  className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  <ShieldCheck size={14} />
                  Switch to {getRoleLabel(allowedRole)}
                </button>
              )}
              <Link
                href="/support"
                className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-800 transition-all hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
              >
                Go to student support
              </Link>
            </div>
            {mode === "supabase" && (
              <p className="mt-5 text-xs leading-6 text-stone-500">
                Update the signed-in user&apos;s role in the `profiles` table to grant access.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

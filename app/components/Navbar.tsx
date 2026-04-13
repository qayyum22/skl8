"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { AuthStatus } from "./AuthStatus";

interface NavbarProps {
  showSupportLink?: boolean;
}

export function Navbar({ showSupportLink = true }: NavbarProps) {
  return (
    <header className="border-b border-stone-200/80 bg-[#f6f2ea]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3 text-stone-900 transition-opacity hover:opacity-80">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-stone-300 bg-white text-stone-700 shadow-sm">
            <GraduationCap size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-stone-500">skl8 support</p>
            <h1 className="truncate text-base font-semibold">skl8</h1>
          </div>
        </Link>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <AuthStatus />
          {showSupportLink && (
            <Link
              href="/support"
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-center text-sm font-medium text-stone-800 transition-all hover:border-stone-400 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            >
              Open support
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

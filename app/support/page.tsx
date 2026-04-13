"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAppAuth } from "@/hooks/useAppAuth";
import { SupportWorkspace } from "../components/SupportWorkspace";
import { Navbar } from "../components/Navbar";

export default function SupportPage() {
  const { isAuthenticated, ready, backendAvailable } = useAppAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && backendAvailable && !isAuthenticated) {
      router.push("/");
    }
  }, [backendAvailable, isAuthenticated, ready, router]);

  if (!ready) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-[#f6f2ea] text-stone-900">
        <Navbar showSupportLink={false} />
        <div className="flex flex-1 items-center justify-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-stone-200 bg-white px-5 py-3 text-sm text-stone-600 shadow-sm">
            <Loader2 size={16} className="animate-spin" />
            Loading support...
          </div>
        </div>
      </div>
    );
  }

  if (!backendAvailable || isAuthenticated) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-[#f6f2ea] text-stone-900">
        <Navbar showSupportLink={false} />
        <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 px-4 py-4 md:px-6 md:py-6">
          <div className="flex min-h-0 w-full overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-[0_20px_70px_rgba(75,55,34,0.08)]">
            <SupportWorkspace mode="page" />
          </div>
        </main>
      </div>
    );
  }

  return null;
}

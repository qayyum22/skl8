"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { SupportWorkspace } from "./SupportWorkspace";

export function SupportLauncher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close support chat"
          className="fixed inset-0 z-40 cursor-pointer bg-ink/40 backdrop-blur-[2px] sm:bg-transparent"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fixed inset-x-3 bottom-4 z-50 sm:inset-x-auto sm:bottom-5 sm:right-5">
        {open && (
          <div className="mb-3 flex h-[calc(100dvh-88px)] w-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-border bg-card shadow-2xl sm:mb-4 sm:h-[min(720px,calc(100dvh-110px))] sm:w-[400px] sm:rounded-[28px]">
            <SupportWorkspace mode="widget" onClose={() => setOpen(false)} />
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close support chat" : "Open support chat"}
          className="glow-accent inline-flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-accent text-white transition-all hover:scale-105 hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          {open ? <X size={20} /> : <MessageCircle size={20} />}
        </button>
      </div>
    </>
  );
}

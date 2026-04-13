"use client";

import { MessageSquare, Star, Plus } from "lucide-react";
import type { ChatSession } from "@/types";

interface Props {
  sessions: ChatSession[];
  activeId: string | null;
  onSwitch: (id: string) => void;
  onNew: () => void;
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function SatisfactionDots({ score }: { score: number | undefined }) {
  if (score === undefined) return null;
  const filled = Math.round(score);

  return (
    <div className="flex items-center gap-0.5" title={`${score.toFixed(1)}/5`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          size={8}
          className={index <= filled ? "text-warning fill-warning" : "text-muted"}
        />
      ))}
    </div>
  );
}

export function HistorySidebar({ sessions, activeId, onSwitch, onNew }: Props) {
  return (
    <aside className="flex h-full w-full flex-shrink-0 flex-col border-r border-border bg-surface/70 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border px-3 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-subtle">
          History
        </span>
        <button
          onClick={onNew}
          className="rounded-md p-1 text-subtle transition-colors hover:bg-card hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          title="New conversation"
          type="button"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {sessions.length === 0 && (
          <p className="px-3 py-6 text-center text-xs leading-relaxed text-subtle">
            No conversations yet.
            <br />
            Start chatting below.
          </p>
        )}

        {sessions.map((session) => (
          <div key={session.id} className="mx-1">
            <button
              type="button"
              onClick={() => onSwitch(session.id)}
              className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                session.id === activeId
                  ? "border-accent/30 bg-accent/10"
                  : "border-transparent hover:border-border hover:bg-card/70"
              }`}
            >
              <MessageSquare
                size={12}
                className={`mt-0.5 flex-shrink-0 ${
                  session.id === activeId ? "text-accent-light" : "text-subtle"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-xs font-medium leading-tight ${
                    session.id === activeId ? "text-text" : "text-subtle"
                  }`}
                >
                  {session.title}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-[10px] text-subtle/70">
                    {formatRelative(session.updatedAt)}
                  </span>
                  <SatisfactionDots score={session.satisfaction} />
                </div>
                {session.messages.filter((message) => message.role === "user").length > 0 && (
                  <span className="text-[10px] text-subtle/50">
                    {session.messages.filter((message) => message.role === "user").length} msg
                  </span>
                )}
              </div>
            </button>
          </div>
        ))}
      </div>

      {sessions.length > 0 && (
        <div className="border-t border-border px-3 py-2 text-[10px] text-subtle/60">
          {sessions.length} conversation{sessions.length !== 1 ? "s" : ""}
          {sessions.some((session) => session.satisfaction !== undefined) && (
            <>
              {" | "}
              {(
                sessions
                  .filter((session) => session.satisfaction !== undefined)
                  .reduce((sum, session) => sum + (session.satisfaction ?? 0), 0) /
                sessions.filter((session) => session.satisfaction !== undefined).length
              ).toFixed(1)}
              /5 avg
            </>
          )}
        </div>
      )}
    </aside>
  );
}

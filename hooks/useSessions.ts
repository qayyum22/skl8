"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AgentCase,
  AgentCaseStatus,
  AgentSeverity,
  ChatSession,
  Message,
} from "@/types";
import {
  MAX_SESSIONS,
  buildAgentCase,
  computeSatisfaction,
  createSeedSessions,
  generateId,
  makeTitle,
  reviveSession,
} from "@/app/lib/session-utils";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/browser";
import { useAppAuth } from "./useAppAuth";

const STORAGE_KEY = "nova_chat_sessions";
const pendingRemoteWrites = new Set<Promise<unknown>>();

interface UseSessionsOptions {
  pollIntervalMs?: number;
}

function trackRemoteWrite<T>(promise: Promise<T>) {
  pendingRemoteWrites.add(promise);
  promise.finally(() => {
    pendingRemoteWrites.delete(promise);
  });
  return promise;
}

export async function flushPendingSessionWrites() {
  while (pendingRemoteWrites.size > 0) {
    await Promise.allSettled(Array.from(pendingRemoteWrites));
  }
}

function queueRemoteWrite<T>(promiseFactory: () => Promise<T>) {
  return trackRemoteWrite(promiseFactory());
}

function loadDemoSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = (JSON.parse(raw) as ChatSession[])
        .map(reviveSession)
        .map((session) => ({
          ...session,
          agentCase: buildAgentCase(session.messages, session.agentCase),
        }));
      return parsed;
    }
  } catch {
    // Ignore local parsing issues and fall back to seeds.
  }

  return createSeedSessions();
}

async function fetchRemoteSessions() {
  const response = await fetch("/api/sessions", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Remote session loading unavailable.");
  }
  const payload = (await response.json()) as { sessions: ChatSession[] };
  return payload.sessions.map(reviveSession);
}

async function saveRemoteSession(session: ChatSession) {
  const response = await fetch("/api/sessions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session }),
  });

  if (!response.ok) {
    throw new Error("Remote session save failed.");
  }

  const payload = (await response.json()) as { session?: ChatSession };
  return payload.session ? reviveSession(payload.session) : undefined;
}

async function removeRemoteSession(id: string) {
  const response = await fetch(`/api/sessions?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Remote session delete failed.");
  }
}

export function useSessions(options: UseSessionsOptions = {}) {
  const { pollIntervalMs = 0 } = options;
  const { mode: authMode, ready: authReady } = useAppAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<"demo" | "remote">("demo");

  const shouldUseRemote = authReady && authMode === "supabase";

  const mergeRemoteSession = useCallback((remoteSession: ChatSession) => {
    setSessions((prev) => {
      const existingIndex = prev.findIndex((session) => session.id === remoteSession.id);
      if (existingIndex === -1) {
        return [remoteSession, ...prev].slice(0, MAX_SESSIONS);
      }

      const existing = prev[existingIndex];
      if (existing.updatedAt.getTime() > remoteSession.updatedAt.getTime()) {
        return prev;
      }

      const next = [...prev];
      next[existingIndex] = remoteSession;
      next.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      return next;
    });

    setActiveId((currentActive) => currentActive ?? remoteSession.id);
  }, []);

  const persistRemoteSession = useCallback((session: ChatSession) => {
    return queueRemoteWrite(async () => {
      const savedSession = await saveRemoteSession(session);
      if (savedSession) {
        mergeRemoteSession(savedSession);
      }
      return savedSession;
    });
  }, [mergeRemoteSession]);

  const refreshSessions = useCallback(async () => {
    if (!shouldUseRemote) {
      const seeded = loadDemoSessions();
      setSessions(seeded);
      setActiveId((currentActive) => {
        if (currentActive && seeded.some((session) => session.id === currentActive)) {
          return currentActive;
        }
        return seeded[0]?.id ?? null;
      });
      setMode("demo");
      return;
    }

    try {
      const remoteSessions = await fetchRemoteSessions();
      setSessions(remoteSessions);
      setActiveId((currentActive) => {
        if (currentActive && remoteSessions.some((session) => session.id === currentActive)) {
          return currentActive;
        }
        return remoteSessions[0]?.id ?? null;
      });
      setMode("remote");
    } catch {
      setMode("remote");
    }
  }, [shouldUseRemote]);

  useEffect(() => {
    if (!authReady) return;

    const timer = setTimeout(() => {
      void refreshSessions();
    }, 0);

    return () => clearTimeout(timer);
  }, [authReady, refreshSessions]);

  useEffect(() => {
    if (!shouldUseRemote || pollIntervalMs <= 0) return;

    const interval = window.setInterval(() => {
      void refreshSessions();
    }, pollIntervalMs);

    return () => window.clearInterval(interval);
  }, [pollIntervalMs, refreshSessions, shouldUseRemote]);

  useEffect(() => {
    if (!shouldUseRemote) return;

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("support-sessions-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_sessions" },
        () => {
          void refreshSessions();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshSessions, shouldUseRemote]);

  useEffect(() => {
    if (!shouldUseRemote) return;

    const handleWindowFocus = () => {
      void refreshSessions();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshSessions();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshSessions, shouldUseRemote]);

  useEffect(() => {
    if (mode !== "demo" || sessions.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Ignore storage quota errors.
    }
  }, [mode, sessions]);

  const activeSession = sessions.find((session) => session.id === activeId) ?? null;

  const createSession = useCallback((initialMessages: Message[] = []): ChatSession => {
    const session: ChatSession = {
      id: generateId(),
      title: makeTitle(initialMessages),
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: initialMessages,
      ownerRole: "customer",
      agentCase: buildAgentCase(initialMessages),
    };

    setSessions((prev) => [session, ...prev].slice(0, MAX_SESSIONS));
    setActiveId(session.id);

    if (shouldUseRemote) {
      void persistRemoteSession(session);
    }

    return session;
  }, [persistRemoteSession, shouldUseRemote]);

  const updateSession = useCallback((id: string, messages: Message[]) => {
    let nextSession: ChatSession | null = null;

    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== id) return session;
        nextSession = {
          ...session,
          messages,
          title: makeTitle(messages),
          updatedAt: new Date(),
          satisfaction: computeSatisfaction(messages),
          agentCase: buildAgentCase(messages, session.agentCase),
        };
        return nextSession;
      })
    );

    if (shouldUseRemote && nextSession) {
      void persistRemoteSession(nextSession as ChatSession);
    }
  }, [persistRemoteSession, shouldUseRemote]);

  const appendMessage = useCallback((sessionId: string, message: Message) => {
    let nextSession: ChatSession | null = null;

    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        const messages = [...session.messages, message];
        const nextCase = buildAgentCase(messages, session.agentCase);
        if (message.role === "assistant" && !nextCase.firstResponseAt) {
          nextCase.firstResponseAt = new Date();
        }
        nextSession = {
          ...session,
          messages,
          title: makeTitle(messages),
          updatedAt: new Date(),
          satisfaction: computeSatisfaction(messages),
          agentCase: {
            ...nextCase,
            lastUpdated: new Date(),
          },
        };
        return nextSession;
      })
    );

    if (shouldUseRemote && nextSession) {
      void persistRemoteSession(nextSession as ChatSession);
    }
  }, [persistRemoteSession, shouldUseRemote]);

  const updateAgentCase = useCallback(
    (sessionId: string, patch: Partial<AgentCase> & { status?: AgentCaseStatus; severity?: AgentSeverity }) => {
      let nextSession: ChatSession | null = null;

      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== sessionId) return session;
          const nextCase = {
            ...buildAgentCase(session.messages, session.agentCase),
            ...patch,
            lastUpdated: new Date(),
          };
          if (nextCase.status === "resolved" && !nextCase.resolvedAt) {
            nextCase.resolvedAt = new Date();
          }
          nextSession = {
            ...session,
            updatedAt: new Date(),
            agentCase: nextCase,
          };
          return nextSession;
        })
      );

      if (shouldUseRemote && nextSession) {
        void persistRemoteSession(nextSession as ChatSession);
      }
    },
    [persistRemoteSession, shouldUseRemote]
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((session) => session.id !== id);
        if (activeId === id) {
          setActiveId(next[0]?.id ?? null);
        }
        return next;
      });

      if (shouldUseRemote) {
        void queueRemoteWrite(() => removeRemoteSession(id));
      }
    },
    [activeId, shouldUseRemote]
  );

  const switchSession = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const rateMessage = useCallback((sessionId: string, messageId: string, rating: 1 | 2 | 3 | 4 | 5) => {
    let nextSession: ChatSession | null = null;

    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        const messages = session.messages.map((message) =>
          message.id === messageId ? { ...message, rating } : message
        );
        nextSession = {
          ...session,
          messages,
          updatedAt: new Date(),
          satisfaction: computeSatisfaction(messages),
          agentCase: buildAgentCase(messages, session.agentCase),
        };
        return nextSession;
      })
    );

    if (shouldUseRemote && nextSession) {
      void persistRemoteSession(nextSession as ChatSession);
    }
  }, [persistRemoteSession, shouldUseRemote]);

  return {
    sessions,
    activeSession,
    activeId,
    mode,
    createSession,
    updateSession,
    appendMessage,
    updateAgentCase,
    deleteSession,
    switchSession,
    rateMessage,
    refreshSessions,
  };
}

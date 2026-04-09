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

const STORAGE_KEY = "nova_chat_sessions";

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
  await fetch("/api/sessions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session }),
  });
}

async function removeRemoteSession(id: string) {
  await fetch(`/api/sessions?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function useSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<"demo" | "remote">("demo");

  const refreshSessions = useCallback(async () => {
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
      return;
    } catch {
      const seeded = loadDemoSessions();
      setSessions(seeded);
      setActiveId((currentActive) => {
        if (currentActive && seeded.some((session) => session.id === currentActive)) {
          return currentActive;
        }
        return seeded[0]?.id ?? null;
      });
      setMode("demo");
    }
  }, []);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

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

    if (mode === "remote") {
      void saveRemoteSession(session);
    }

    return session;
  }, [mode]);

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

    if (mode === "remote" && nextSession) {
      void saveRemoteSession(nextSession);
    }
  }, [mode]);

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

    if (mode === "remote" && nextSession) {
      void saveRemoteSession(nextSession);
    }
  }, [mode]);

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

      if (mode === "remote" && nextSession) {
        void saveRemoteSession(nextSession);
      }
    },
    [mode]
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

      if (mode === "remote") {
        void removeRemoteSession(id);
      }
    },
    [activeId, mode]
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

    if (mode === "remote" && nextSession) {
      void saveRemoteSession(nextSession);
    }
  }, [mode]);

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

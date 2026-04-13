"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured } from "@/app/lib/env";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/browser";
import { flushPendingSessionWrites } from "./useSessions";
import type { AppRole, MockUser } from "@/types";

const STORAGE_KEY = "nova_mock_user";

const MOCK_USERS: MockUser[] = [
  { id: "cust-1", name: "Ava Student", email: "ava@student.demo", role: "customer" },
  { id: "agent-1", name: "Jordan Support", email: "jordan@internal.demo", role: "agent" },
  { id: "admin-1", name: "Priya Admin", email: "priya@internal.demo", role: "admin" },
];

interface AuthState {
  ready: boolean;
  user: MockUser;
  availableUsers: MockUser[];
  switchRole: (role: AppRole) => void;
  switchUser: (userId: string) => void;
  mode: "demo" | "supabase";
  backendAvailable: boolean;
  authBusy: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string; user?: MockUser }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string; message?: string; user?: MockUser }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

function loadDemoUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockUser;
      const matched = MOCK_USERS.find((candidate) => candidate.id === parsed.id);
      if (matched) {
        return matched;
      }
    }
  } catch {
    // Ignore local auth parse issues.
  }

  return MOCK_USERS[0];
}

async function resolveSupabaseUser() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", authUser.id)
    .maybeSingle();

  return {
    id: authUser.id,
    name: profile?.full_name || authUser.user_metadata.full_name || authUser.email || "skl8 User",
    email: authUser.email || "",
    role: (profile?.role as AppRole | undefined) || "customer",
  } satisfies MockUser;
}

export function useAppAuth(): AuthState {
  const [user, setUser] = useState<MockUser>(MOCK_USERS[0]);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"demo" | "supabase">("demo");
  const [authBusy, setAuthBusy] = useState(false);
  const backendAvailable = isSupabaseConfigured();

  const syncFromCurrentSession = useCallback(async () => {
    if (!backendAvailable) {
      const demoUser = loadDemoUser();
      setUser(demoUser);
      setMode("demo");
      return;
    }

    try {
      const nextUser = await resolveSupabaseUser();
      if (nextUser) {
        setUser(nextUser);
        setMode("supabase");
        return;
      }
    } catch {
      // Ignore Supabase session lookups and fall back to demo mode.
    }

    const demoUser = loadDemoUser();
    setUser(demoUser);
    setMode("demo");
  }, [backendAvailable]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await syncFromCurrentSession();
      if (!cancelled) {
        setReady(true);
      }
    }

    void load();

    if (!backendAvailable) {
      return () => {
        cancelled = true;
      };
    }

    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncFromCurrentSession();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [backendAvailable, syncFromCurrentSession]);

  useEffect(() => {
    if (!ready || mode !== "demo") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }, [mode, ready, user]);

  const availableUsers = useMemo(() => MOCK_USERS, []);

  const switchRole = (role: AppRole) => {
    if (mode !== "demo") return;
    const matched = MOCK_USERS.find((candidate) => candidate.role === role);
    if (matched) {
      setUser(matched);
    }
  };

  const switchUser = (userId: string) => {
    if (mode !== "demo") return;
    const matched = MOCK_USERS.find((candidate) => candidate.id === userId);
    if (matched) {
      setUser(matched);
    }
  };

  const signIn = useCallback(async (email: string, password: string) => {
    if (!backendAvailable) {
      return { error: "Supabase is not configured in this environment." };
    }

    setAuthBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: error.message };
      }

      const nextUser = await resolveSupabaseUser();
      if (nextUser) {
        setUser(nextUser);
        setMode("supabase");
        return { user: nextUser };
      }

      await syncFromCurrentSession();
      return {};
    } finally {
      setAuthBusy(false);
    }
  }, [backendAvailable, syncFromCurrentSession]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    if (!backendAvailable) {
      return { error: "Supabase is not configured in this environment." };
    }

    setAuthBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (!data.session) {
        return { message: "Account created. Check your email to confirm the account before signing in." };
      }

      const nextUser = await resolveSupabaseUser();
      if (nextUser) {
        setUser(nextUser);
        setMode("supabase");
        return { message: "Account created and signed in.", user: nextUser };
      }

      await syncFromCurrentSession();
      return { message: "Account created and signed in." };
    } finally {
      setAuthBusy(false);
    }
  }, [backendAvailable, syncFromCurrentSession]);

  const signOut = useCallback(async () => {
    if (!backendAvailable) {
      setUser(loadDemoUser());
      setMode("demo");
      return;
    }

    setAuthBusy(true);
    try {
      await flushPendingSessionWrites();
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      const demoUser = loadDemoUser();
      setUser(demoUser);
      setMode("demo");
    } finally {
      setAuthBusy(false);
    }
  }, [backendAvailable]);

  return {
    ready,
    user,
    availableUsers,
    switchRole,
    switchUser,
    mode,
    backendAvailable,
    authBusy,
    signIn,
    signUp,
    signOut,
    refreshProfile: syncFromCurrentSession,
  };
}

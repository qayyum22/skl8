"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppRole, MockUser } from "@/types";

const STORAGE_KEY = "nova_mock_user";

const MOCK_USERS: MockUser[] = [
  { id: "cust-1", name: "Ava Student", email: "ava@student.demo", role: "customer" },
  { id: "agent-1", name: "Jordan Support", email: "jordan@internal.demo", role: "agent" },
  { id: "admin-1", name: "Priya Admin", email: "priya@internal.demo", role: "admin" },
];

export function useMockAuth() {
  const [user, setUser] = useState<MockUser>(MOCK_USERS[0]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MockUser;
        const matched = MOCK_USERS.find((candidate) => candidate.id === parsed.id);
        if (matched) {
          setUser(matched);
        }
      }
    } catch {
      // Ignore local auth parse issues.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }, [ready, user]);

  const availableUsers = useMemo(() => MOCK_USERS, []);

  const switchRole = (role: AppRole) => {
    const matched = MOCK_USERS.find((candidate) => candidate.role === role);
    if (matched) {
      setUser(matched);
    }
  };

  const switchUser = (userId: string) => {
    const matched = MOCK_USERS.find((candidate) => candidate.id === userId);
    if (matched) {
      setUser(matched);
    }
  };

  return {
    ready,
    user,
    availableUsers,
    switchRole,
    switchUser,
  };
}

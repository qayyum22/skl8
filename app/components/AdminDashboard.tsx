"use client";

import { AlertTriangle, BarChart3, CheckCircle2, Clock3, ShieldAlert, Star, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSessions } from "@/hooks/useSessions";
import type { ChatSession, SupportCategory } from "@/types";
import { AuthStatus } from "./AuthStatus";
import { DatabaseOperationsPanel } from "./DatabaseOperationsPanel";
import { KnowledgeOperationsPanel } from "./KnowledgeOperationsPanel";
import { MessageBubble } from "./MessageBubble";

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function minutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

const CATEGORY_LABELS: Record<SupportCategory, string> = {
  login_access: "Login Access",
  course_access: "Course Access",
  schedule: "Schedule",
  fees: "Fees",
  certificate: "Certificate",
  enrollment: "Enrollment",
  general: "General",
};

export function AdminDashboard() {
  const { sessions, refreshSessions } = useSessions({ pollIntervalMs: 5000 });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const selectedSession = useMemo<ChatSession | null>(() => sessions.find((session) => session.id === selectedSessionId) ?? null, [selectedSessionId, sessions]);

  const metrics = useMemo(() => {
    const cases = sessions.filter((session) => session.agentCase);
    const firstResponseMinutes = cases.flatMap((session) =>
      session.agentCase?.firstResponseAt ? [minutesBetween(session.createdAt, session.agentCase.firstResponseAt)] : []
    );
    const resolutionMinutes = cases.flatMap((session) =>
      session.agentCase?.resolvedAt ? [minutesBetween(session.createdAt, session.agentCase.resolvedAt)] : []
    );
    const csatValues = sessions.flatMap((session) => (session.satisfaction ? [session.satisfaction] : []));
    const agentWorkload = cases.reduce<Record<string, number>>((acc, session) => {
      const agent = session.agentCase?.assignedTo || "Unassigned";
      acc[agent] = (acc[agent] || 0) + 1;
      return acc;
    }, {});
    const agentResolutions = cases.reduce<Record<string, number>>((acc, session) => {
      if (session.agentCase?.status !== "resolved") return acc;
      const agent = session.agentCase?.assignedTo || "Unassigned";
      acc[agent] = (acc[agent] || 0) + 1;
      return acc;
    }, {});
    const categoryMix = cases.reduce<Record<string, number>>((acc, session) => {
      const category = CATEGORY_LABELS[session.agentCase!.category];
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    const urgentCases = cases.filter((session) => session.agentCase?.severity === "urgent");

    return {
      totalRequests: sessions.length,
      openQueue: cases.filter((session) => session.agentCase?.status !== "resolved").length,
      escalationRate: cases.length === 0 ? 0 : Math.round((cases.filter((session) => session.agentCase?.escalated).length / cases.length) * 100),
      firstResponse: average(firstResponseMinutes),
      resolutionTime: average(resolutionMinutes),
      csat: average(csatValues),
      agentWorkload,
      agentResolutions,
      categoryMix,
      urgentCases,
    };
  }, [sessions]);

  return (
    <div className="min-h-full bg-[#f6f2ea] px-4 py-6 text-stone-900 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Admin View</p>
            <h1 className="mt-1 text-2xl font-semibold text-stone-900 sm:text-3xl">Support Operations Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">Track queue health, responsiveness, escalations, and support operations in one calm view.</p>
          </div>
          <AuthStatus />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-stone-500"><Users size={16} /><span className="text-xs uppercase tracking-wide">Total requests</span></div><p className="mt-3 text-3xl font-semibold">{metrics.totalRequests}</p></div>
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-stone-500"><Clock3 size={16} /><span className="text-xs uppercase tracking-wide">Open queue</span></div><p className="mt-3 text-3xl font-semibold">{metrics.openQueue}</p></div>
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-stone-500"><BarChart3 size={16} /><span className="text-xs uppercase tracking-wide">Avg first response</span></div><p className="mt-3 text-3xl font-semibold">{metrics.firstResponse.toFixed(0)} min</p></div>
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-stone-500"><CheckCircle2 size={16} /><span className="text-xs uppercase tracking-wide">Avg resolution</span></div><p className="mt-3 text-3xl font-semibold">{metrics.resolutionTime.toFixed(0)} min</p></div>
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-stone-500"><ShieldAlert size={16} /><span className="text-xs uppercase tracking-wide">Escalation rate</span></div><p className="mt-3 text-3xl font-semibold">{metrics.escalationRate}%</p></div>
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-stone-500"><Star size={16} /><span className="text-xs uppercase tracking-wide">Average CSAT</span></div><p className="mt-3 text-3xl font-semibold">{metrics.csat.toFixed(1) || "0.0"}</p></div>
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-stone-500"><Users size={16} /><span className="text-xs uppercase tracking-wide">Assigned agents</span></div><p className="mt-3 text-3xl font-semibold">{Object.keys(metrics.agentWorkload).length}</p></div>
        </div>

        <DatabaseOperationsPanel sessionCount={sessions.length} onRefreshSessions={refreshSessions} />
        <KnowledgeOperationsPanel />

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">All requests</h2>
            {selectedSession && (
              <button
                type="button"
                onClick={() => setSelectedSessionId(null)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-surface px-3 py-2 text-sm text-stone-900 transition-all hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
              >
                <X size={14} />
                Close request
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-3 xl:max-h-[720px] xl:overflow-y-auto xl:pr-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`w-full cursor-pointer rounded-2xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 ${selectedSession?.id === session.id ? "border-accent/40 bg-card shadow-sm" : "border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-stone-50"}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-stone-900">{session.title}</span>
                    <span className="text-stone-500">{session.agentCase?.status ?? "new"}</span>
                  </div>
                  <p className="mt-1 text-sm text-stone-500">{session.agentCase?.summary ?? "Learner follow-up needed"}</p>
                </button>
              ))}
              {sessions.length === 0 && <p className="text-sm text-stone-500">No requests found.</p>}
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 xl:max-h-[720px] xl:overflow-y-auto">
              {selectedSession ? (
                <div className="space-y-4">
                  <div className="sticky top-0 z-10 -mx-4 -mt-4 border-b border-stone-200 bg-white/95 px-4 py-4 backdrop-blur-sm">
                    <h3 className="text-base font-semibold text-stone-900">{selectedSession.title}</h3>
                    <p className="mt-1 text-sm text-stone-500">{selectedSession.agentCase?.summary ?? "Learner follow-up needed"}</p>
                  </div>
                  <div className="space-y-4 pt-4">
                    {selectedSession.messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-stone-500">Select a request to view the full conversation.</p>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Category mix</h2>
            <div className="mt-4 space-y-3">
              {Object.entries(metrics.categoryMix).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
                  <span>{category}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
              {Object.keys(metrics.categoryMix).length === 0 && <p className="text-sm text-stone-500">No case volume yet.</p>}
            </div>
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Agent workload</h2>
            <div className="mt-4 space-y-3">
              {Object.entries(metrics.agentWorkload).map(([agent, count]) => (
                <div key={agent} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
                  <span>{agent}</span>
                  <span className="font-semibold">{count} cases</span>
                </div>
              ))}
              {Object.keys(metrics.agentWorkload).length === 0 && <p className="text-sm text-stone-500">No assigned workload yet.</p>}
            </div>
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-2 xl:col-span-1">
            <h2 className="text-lg font-semibold">Resolved by agent</h2>
            <div className="mt-4 space-y-3">
              {Object.entries(metrics.agentResolutions).map(([agent, count]) => (
                <div key={agent} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
                  <span>{agent}</span>
                  <span className="font-semibold">{count} resolved</span>
                </div>
              ))}
              {Object.keys(metrics.agentResolutions).length === 0 && <p className="text-sm text-stone-500">No resolved cases yet.</p>}
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-stone-500">
            <AlertTriangle size={16} />
            <h2 className="text-lg font-semibold text-stone-900">Urgent learner cases</h2>
          </div>
          <div className="mt-4 space-y-3">
            {metrics.urgentCases.map((session) => (
              <div key={session.id} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-stone-900">{session.title}</p>
                  <span className="text-xs text-stone-500">{session.agentCase?.assignedTo || "Unassigned"}</span>
                </div>
                <p className="mt-1 text-sm text-stone-500">{session.agentCase?.summary}</p>
              </div>
            ))}
            {metrics.urgentCases.length === 0 && <p className="text-sm text-stone-500">No urgent learner cases right now.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}


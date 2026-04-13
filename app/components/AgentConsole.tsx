"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  ChevronDown,
  CheckCircle2,
  Clock3,
  Menu,
  MessageSquare,
  Search,
  Send,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import { useSessions } from "@/hooks/useSessions";
import type { AgentCaseStatus, AgentSeverity, ChatSession, Message, SupportCategory } from "@/types";
import { AuthStatus } from "./AuthStatus";
import { MessageBubble } from "./MessageBubble";

const AGENTS = ["Jordan Support", "Priya Support", "Omar Support", "You"] as const;
const STATUS_OPTIONS: Array<{ value: AgentCaseStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "working", label: "Working" },
  { value: "waiting", label: "Waiting" },
  { value: "resolved", label: "Resolved" },
];
const SEVERITY_OPTIONS: Array<{ value: AgentSeverity | "all"; label: string }> = [
  { value: "all", label: "All severities" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];
const CATEGORY_OPTIONS: Array<{ value: SupportCategory | "all"; label: string }> = [
  { value: "all", label: "All categories" },
  { value: "login_access", label: "Login" },
  { value: "course_access", label: "Course Access" },
  { value: "schedule", label: "Schedule" },
  { value: "fees", label: "Fees" },
  { value: "certificate", label: "Certificate" },
  { value: "enrollment", label: "Enrollment" },
  { value: "general", label: "General" },
];

const severityRank: Record<AgentSeverity, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function formatRelative(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function severityTone(severity: AgentSeverity) {
  switch (severity) {
    case "urgent":
      return "border-danger/30 bg-danger/10 text-danger";
    case "high":
      return "border-warning/30 bg-warning/10 text-warning";
    case "medium":
      return "border-accent/30 bg-accent/10 text-accent-light";
    case "low":
      return "border-success/30 bg-success/10 text-success";
  }
}

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

function lastLearnerMessage(session: ChatSession) {
  return [...session.messages].reverse().find((message) => message.role === "user")?.content ?? "No learner message yet.";
}

export function AgentConsole() {
  const { sessions, switchSession, appendMessage, updateAgentCase } = useSessions({ pollIntervalMs: 5000 });
  const [showQueue, setShowQueue] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AgentCaseStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<AgentSeverity | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<SupportCategory | "all">("all");
  const [sortBy, setSortBy] = useState<"severity" | "updated" | "satisfaction">("severity");
  const [search, setSearch] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [showMobileStats, setShowMobileStats] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const requestSessions = useMemo(() => {
    return sessions
      .filter((session) => Boolean(session.agentCase))
      .filter((session) => {
        const currentCase = session.agentCase;
        if (!currentCase) return false;
        if (statusFilter !== "all" && currentCase.status !== statusFilter) return false;
        if (severityFilter !== "all" && currentCase.severity !== severityFilter) return false;
        if (categoryFilter !== "all" && currentCase.category !== categoryFilter) return false;
        if (search && !`${session.title} ${currentCase.summary} ${lastLearnerMessage(session)}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .sort((left, right) => {
        if (sortBy === "updated") return right.updatedAt.getTime() - left.updatedAt.getTime();
        if (sortBy === "satisfaction") return (left.satisfaction ?? 0) - (right.satisfaction ?? 0);
        const severityDiff = severityRank[left.agentCase!.severity] - severityRank[right.agentCase!.severity];
        if (severityDiff !== 0) return severityDiff;
        return right.updatedAt.getTime() - left.updatedAt.getTime();
      });
  }, [categoryFilter, search, sessions, severityFilter, sortBy, statusFilter]);

  const selectedSession = selectedSessionId
    ? requestSessions.find((session) => session.id === selectedSessionId) ?? null
    : null;


  const totalRequestCount = requestSessions.length;
  const openCount = requestSessions.filter((session) => session.agentCase?.status !== "resolved").length;
  const urgentCount = requestSessions.filter((session) => session.agentCase?.severity === "urgent").length;
  const escalatedCount = requestSessions.filter((session) => session.agentCase?.escalated).length;

  const sendReply = (status: AgentCaseStatus) => {
    if (!selectedSession || !replyDraft.trim()) return;
    const message: Message = {
      id: createId(),
      role: "assistant",
      content: replyDraft.trim(),
      timestamp: new Date(),
    };
    appendMessage(selectedSession.id, message);
    updateAgentCase(selectedSession.id, {
      status,
      resolutionNotes: notesDraft.trim() || selectedSession.agentCase?.resolutionNotes,
    });
    setReplyDraft("");
  };

  const handleSelectSession = (session: ChatSession) => {
    setSelectedSessionId(session.id);
    setReplyDraft("");
    setNotesDraft(session.agentCase?.resolutionNotes ?? "");
    switchSession(session.id);
    setShowQueue(false);
    setShowMobileStats(false);
    setShowMobileFilters(false);
  };

  const closeSelectedSession = () => {
    setSelectedSessionId(null);
    setReplyDraft("");
    setNotesDraft("");
    setShowMobileStats(false);
    setShowMobileFilters(false);
  };

  return (
    <div className="min-h-full overflow-y-auto bg-[#f6f2ea] text-stone-900 xl:flex xl:h-full xl:min-h-0 xl:overflow-hidden">
      <div className={`fixed inset-y-0 left-0 z-40 w-[min(88vw,320px)] transition-transform duration-300 lg:w-80 xl:static xl:inset-auto xl:w-80 ${showQueue ? "translate-x-0" : "-translate-x-full xl:translate-x-0"}`}>
        <aside className="flex h-full w-full flex-col border-r border-stone-200 bg-white/95 backdrop-blur-sm">
          <div className="border-b border-stone-200 px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Human Agent Queue</p>
                <h2 className="mt-1 text-lg font-semibold text-stone-900">Student Requests</h2>
              </div>
              <button type="button" onClick={() => setShowQueue(false)} className="rounded-lg border border-stone-200 bg-stone-50 p-2 text-stone-500 transition-all hover:border-stone-300 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 xl:hidden">
                <X size={14} />
              </button>
            </div>
            <label className="relative block">
              <Search size={14} className="absolute left-3 top-3.5 text-stone-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requests" className="w-full rounded-xl border border-stone-200 bg-stone-50 py-3 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200" />
            </label>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 xl:min-h-0">
            {requestSessions.map((session) => (
              <button key={session.id} type="button" onClick={() => handleSelectSession(session)} className={`w-full rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 ${session.id === selectedSession?.id ? "border-stone-300 bg-stone-50 shadow-sm" : "border-stone-200 bg-white"}`}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-900">{session.title}</p>
                    <p className="mt-1 text-xs text-stone-500">{formatRelative(session.updatedAt)}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${severityTone(session.agentCase!.severity)}`}>{session.agentCase!.severity}</span>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-stone-600">{session.agentCase!.summary}</p>
                <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-stone-500">
                  <span className="truncate uppercase tracking-wide">{session.agentCase!.category.replace("_", " ")}</span>
                  <span className="truncate">{session.agentCase!.assignedTo || "Unassigned"}</span>
                </div>
              </button>
            ))}
            {requestSessions.length === 0 && <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">No student requests match the selected filters.</div>}
          </div>
        </aside>
      </div>

      {showQueue && <button type="button" className="fixed inset-0 z-30 bg-stone-900/10 backdrop-blur-[2px] xl:hidden" onClick={() => setShowQueue(false)} aria-label="Close request queue" />}

      <div className="flex min-w-0 flex-1 flex-col xl:min-h-0">
        <header className="border-b border-stone-200 bg-white/90 px-3 py-4 backdrop-blur-sm sm:px-4 md:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setShowQueue((value) => !value)} className="rounded-lg border border-stone-200 bg-stone-50 p-2 text-stone-500 transition-all hover:border-stone-300 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 xl:hidden"><Menu size={14} /></button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Human Agent View</p>
                <h1 className="text-lg font-semibold text-stone-900 sm:text-xl">Student Resolution Console</h1>
              </div>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2 xl:flex xl:w-auto xl:flex-wrap xl:justify-end">
              <AuthStatus compact />
              {selectedSession && (
                <button
                  type="button"
                  onClick={closeSelectedSession}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-900 transition-all hover:border-stone-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
                >
                  <X size={12} />
                  Close case
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowMobileStats((value) => !value)}
                className="inline-flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-900 transition-all hover:border-stone-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 xl:hidden"
              >
                Queue stats
                <ChevronDown size={12} className={`transition-transform ${showMobileStats ? "rotate-180" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowMobileFilters((value) => !value)}
                className="inline-flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-900 transition-all hover:border-stone-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 xl:hidden"
              >
                Filters
                <ChevronDown size={12} className={`transition-transform ${showMobileFilters ? "rotate-180" : ""}`} />
              </button>
              <label className="hidden xl:inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-subtle"><ArrowDownWideNarrow size={12} /><select value={sortBy} onChange={(event) => setSortBy(event.target.value as "severity" | "updated" | "satisfaction")} className="min-w-0 bg-transparent text-text focus:outline-none"><option value="severity">Severity order</option><option value="updated">Newest first</option><option value="satisfaction">Lowest CSAT</option></select></label>
              <label className="hidden xl:block rounded-lg border border-border bg-card px-3 py-2 text-xs text-subtle"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AgentCaseStatus | "all")} className="w-full min-w-0 bg-transparent text-text focus:outline-none">{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="hidden xl:block rounded-lg border border-border bg-card px-3 py-2 text-xs text-subtle"><select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as AgentSeverity | "all")} className="w-full min-w-0 bg-transparent text-text focus:outline-none">{SEVERITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="hidden xl:block rounded-lg border border-border bg-card px-3 py-2 text-xs text-subtle"><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as SupportCategory | "all")} className="w-full min-w-0 bg-transparent text-text focus:outline-none">{CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            </div>
          </div>
          {showMobileStats && (
            <div className="mt-4 grid gap-3 xl:hidden">
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-subtle"><MessageSquare size={14} /><span className="text-xs uppercase tracking-wide">Total requests</span></div><p className="mt-2 text-2xl font-semibold text-text">{totalRequestCount}</p></div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-subtle"><Clock3 size={14} /><span className="text-xs uppercase tracking-wide">Open queue</span></div><p className="mt-2 text-2xl font-semibold text-text">{openCount}</p></div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-subtle"><AlertTriangle size={14} /><span className="text-xs uppercase tracking-wide">Urgent</span></div><p className="mt-2 text-2xl font-semibold text-text">{urgentCount}</p></div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-subtle"><ShieldAlert size={14} /><span className="text-xs uppercase tracking-wide">Escalated</span></div><p className="mt-2 text-2xl font-semibold text-text">{escalatedCount}</p></div>
            </div>
          )}
          {showMobileFilters && (
            <div className="mt-4 grid gap-2 xl:hidden">
              <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-subtle"><ArrowDownWideNarrow size={12} /><select value={sortBy} onChange={(event) => setSortBy(event.target.value as "severity" | "updated" | "satisfaction")} className="min-w-0 flex-1 bg-transparent text-text focus:outline-none"><option value="severity">Severity order</option><option value="updated">Newest first</option><option value="satisfaction">Lowest CSAT</option></select></label>
              <label className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-subtle"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AgentCaseStatus | "all")} className="w-full min-w-0 bg-transparent text-text focus:outline-none">{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-subtle"><select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as AgentSeverity | "all")} className="w-full min-w-0 bg-transparent text-text focus:outline-none">{SEVERITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-subtle"><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as SupportCategory | "all")} className="w-full min-w-0 bg-transparent text-text focus:outline-none">{CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            </div>
          )}
          <div className="mt-4 hidden gap-3 xl:grid xl:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm"><div className="flex items-center gap-2 text-subtle"><MessageSquare size={14} /><span className="text-xs uppercase tracking-wide">Total requests</span></div><p className="mt-2 text-2xl font-semibold text-text">{totalRequestCount}</p></div>
            <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm"><div className="flex items-center gap-2 text-subtle"><Clock3 size={14} /><span className="text-xs uppercase tracking-wide">Open queue</span></div><p className="mt-2 text-2xl font-semibold text-text">{openCount}</p></div>
            <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm"><div className="flex items-center gap-2 text-subtle"><AlertTriangle size={14} /><span className="text-xs uppercase tracking-wide">Urgent</span></div><p className="mt-2 text-2xl font-semibold text-text">{urgentCount}</p></div>
            <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm"><div className="flex items-center gap-2 text-subtle"><ShieldAlert size={14} /><span className="text-xs uppercase tracking-wide">Escalated</span></div><p className="mt-2 text-2xl font-semibold text-text">{escalatedCount}</p></div>
          </div>
        </header>

        {selectedSession ? (
          <div className="flex flex-1 flex-col xl:min-h-0 xl:flex-row">
            <section className="flex-1 px-3 py-4 sm:px-4 md:px-6 md:py-6 xl:min-h-0 xl:overflow-y-auto xl:px-8">
              <div className="mx-auto w-full max-w-4xl space-y-5">
                {selectedSession.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
              </div>
            </section>
            <aside className="flex w-full flex-shrink-0 flex-col border-t border-border bg-surface/70 p-4 sm:p-5 xl:min-h-0 xl:w-[340px] xl:border-l xl:border-t-0 2xl:w-[360px]">
              <div className="flex flex-col space-y-5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
                <div className="rounded-2xl border border-border bg-card/85 p-4 shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text">{selectedSession.title}</p>
                      <p className="mt-1 text-xs text-subtle">{selectedSession.agentCase?.summary}</p>
                    </div>
                    <button
                      type="button"
                      onClick={closeSelectedSession}
                      className="rounded-lg border border-border bg-surface p-2 text-subtle transition-all hover:border-accent/30 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                      aria-label="Close current case"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${severityTone(selectedSession.agentCase!.severity)}`}>{selectedSession.agentCase?.severity}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-subtle">{lastLearnerMessage(selectedSession)}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card/85 p-4 shadow-sm">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-subtle">Case controls</p>
                  <label className="block text-xs text-subtle">Assigned agent<div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2"><UserRound size={14} className="text-subtle" /><select value={selectedSession.agentCase?.assignedTo || ""} onChange={(event) => updateAgentCase(selectedSession.id, { assignedTo: event.target.value || undefined, status: event.target.value ? "working" : selectedSession.agentCase?.status })} className="w-full bg-transparent text-sm text-text focus:outline-none"><option value="">Unassigned</option>{AGENTS.map((agent) => <option key={agent} value={agent}>{agent}</option>)}</select></div></label>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">{STATUS_OPTIONS.filter((option) => option.value !== "all").map((option) => <button key={option.value} type="button" onClick={() => updateAgentCase(selectedSession.id, { status: option.value as AgentCaseStatus })} className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${selectedSession.agentCase?.status === option.value ? "border-accent/40 bg-accent/10 text-text" : "border-border bg-surface hover:border-accent/30 hover:bg-card"}`}>{option.label}</button>)}</div>
                </div>
                <div className="rounded-2xl border border-border bg-card/85 p-4 shadow-sm"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-subtle">Agent reply</p><textarea value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} rows={5} placeholder="Write the human support response here..." className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text placeholder:text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20" /><div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap"><button type="button" onClick={() => sendReply("waiting")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent px-4 py-2 text-sm text-white transition-all hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"><Send size={14} />Send reply</button><button type="button" onClick={() => sendReply("resolved")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-success px-4 py-2 text-sm text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/60"><CheckCircle2 size={14} />Resolve</button></div></div>
                <div className="rounded-2xl border border-border bg-card/85 p-4 shadow-sm"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-subtle">Internal notes</p><textarea value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} rows={8} placeholder="Capture payment references, access fixes, or learner promises." className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text placeholder:text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20" /><button type="button" onClick={() => updateAgentCase(selectedSession.id, { resolutionNotes: notesDraft.trim() })} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text transition-all hover:border-accent/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"><MessageSquare size={14} />Save notes</button></div>
              </div>
            </aside>
          </div>
        ) : requestSessions.length > 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-stone-500">Select a student request from the queue to open the conversation.</div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-stone-500">No student requests yet. Use the student support view or widget to create a support conversation first.</div>
        )}
      </div>
    </div>
  );
}



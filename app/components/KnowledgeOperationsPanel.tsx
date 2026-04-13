"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, FileText, Globe, Loader2, RefreshCcw, Sparkles, UploadCloud } from "lucide-react";
import { useAppAuth } from "@/hooks/useAppAuth";
import type { KnowledgeSourceRecord, KnowledgeSyncRunRecord, KnowledgeVisibility } from "@/types";

interface Snapshot {
  mode: "demo" | "supabase";
  counts: {
    sources: number;
    chunks: number;
    last24hSyncs: number;
  };
  sources: KnowledgeSourceRecord[];
  runs: KnowledgeSyncRunRecord[];
}

const INITIAL_URL_FORM = {
  title: "",
  canonicalUrl: "",
  visibility: "public" as KnowledgeVisibility,
};

const INITIAL_DOC_FORM = {
  title: "",
  documentBody: "",
  visibility: "internal" as KnowledgeVisibility,
  fileName: "",
  fileType: "text/plain",
};

export function KnowledgeOperationsPanel() {
  const { backendAvailable, mode } = useAppAuth();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [urlForm, setUrlForm] = useState(INITIAL_URL_FORM);
  const [docForm, setDocForm] = useState(INITIAL_DOC_FORM);

  const canMutate = !backendAvailable || mode === "supabase";

  const loadSnapshot = async () => {
    setBusyKey("load");
    setStatus(null);
    try {
      const response = await fetch("/api/admin/knowledge", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error || "Unable to load knowledge snapshot.");
        return;
      }
      setSnapshot(payload as Snapshot);
      setStatus(payload.mode === "demo" ? "Loaded demo knowledge snapshot." : "Loaded latest knowledge snapshot.");
    } catch {
      setStatus("Unable to reach the knowledge endpoint.");
    } finally {
      setBusyKey(null);
    }
  };

  useEffect(() => {
    void loadSnapshot();
  }, []);

  const runAction = async (action: string, payload?: Record<string, unknown>, successMessage?: string) => {
    setBusyKey(action);
    setStatus(null);
    try {
      const method = action === "archive" ? "PATCH" : "POST";
      const response = await fetch("/api/admin/knowledge", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "archive" ? { action, sourceId: payload?.sourceId } : { action, ...payload }),
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus(result.error || "Knowledge operation failed.");
        return;
      }
      setStatus(result.message || successMessage || "Knowledge operation completed.");
      await loadSnapshot();
    } catch {
      setStatus("Knowledge operation failed unexpectedly.");
    } finally {
      setBusyKey(null);
    }
  };

  const sourceSummary = useMemo(() => {
    return snapshot?.sources ?? [];
  }, [snapshot]);

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-subtle">Knowledge Ops</p>
          <h2 className="mt-1 text-lg font-semibold text-text">Hybrid FAQ and RAG knowledge base</h2>
          <p className="mt-2 text-sm leading-6 text-subtle">
            Register live URLs, upload internal text notes, sync chunked knowledge into the support bot, and inspect recent sync health.
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-wide ${snapshot?.mode === "supabase" ? "border-success/25 bg-success/10 text-success" : "border-warning/25 bg-warning/10 text-warning"}`}>
          <Sparkles size={12} />
          {snapshot?.mode === "supabase" ? "Knowledge DB active" : "Demo knowledge"}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <p className="text-xs uppercase tracking-wide text-subtle">Sources</p>
          <p className="mt-2 text-2xl font-semibold text-text">{snapshot?.counts.sources ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <p className="text-xs uppercase tracking-wide text-subtle">Chunks</p>
          <p className="mt-2 text-2xl font-semibold text-text">{snapshot?.counts.chunks ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <p className="text-xs uppercase tracking-wide text-subtle">Syncs / 24h</p>
          <p className="mt-2 text-2xl font-semibold text-text">{snapshot?.counts.last24hSyncs ?? "-"}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => void loadSnapshot()}
          disabled={busyKey !== null}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text transition-all hover:border-accent/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50"
        >
          {busyKey === "load" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          Refresh knowledge snapshot
        </button>
        <button
          type="button"
          onClick={() => void runAction("sync_all", {}, "Knowledge sync completed.")}
          disabled={busyKey !== null || !canMutate}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text transition-all hover:border-accent/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50"
        >
          {busyKey === "sync_all" ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
          Sync all sources
        </button>
      </div>

      {!canMutate ? (
        <div className="mt-4 rounded-2xl border border-warning/20 bg-warning/10 p-4 text-sm leading-6 text-subtle">
          Sign into a Supabase-backed admin session to manage persistent knowledge sources. Demo mode still lets you inspect the knowledge UX.
        </div>
      ) : null}

      {status ? <div className="mt-4 rounded-2xl border border-border bg-surface/70 px-4 py-3 text-sm text-subtle">{status}</div> : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void runAction("add_url", urlForm, "URL source added.");
            setUrlForm(INITIAL_URL_FORM);
          }}
          className="rounded-2xl border border-border bg-surface/60 p-4"
        >
          <div className="flex items-center gap-2 text-text">
            <Globe size={16} />
            <h3 className="text-sm font-semibold">Add public URL source</h3>
          </div>
          <div className="mt-3 space-y-3">
            <input
              value={urlForm.title}
              onChange={(event) => setUrlForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Source title"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text placeholder:text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <input
              value={urlForm.canonicalUrl}
              onChange={(event) => setUrlForm((current) => ({ ...current, canonicalUrl: event.target.value }))}
              placeholder="https://example.com/support/article"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text placeholder:text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <select
              value={urlForm.visibility}
              onChange={(event) => setUrlForm((current) => ({ ...current, visibility: event.target.value as KnowledgeVisibility }))}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="public">Public</option>
              <option value="internal">Internal</option>
            </select>
            <button
              type="submit"
              disabled={busyKey !== null || !urlForm.title.trim() || !urlForm.canonicalUrl.trim() || !canMutate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm text-white transition-all hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50"
            >
              {busyKey === "add_url" ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
              Add URL
            </button>
          </div>
        </form>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void runAction("add_document", docForm, "Document source added.");
            setDocForm(INITIAL_DOC_FORM);
          }}
          className="rounded-2xl border border-border bg-surface/60 p-4"
        >
          <div className="flex items-center gap-2 text-text">
            <FileText size={16} />
            <h3 className="text-sm font-semibold">Upload internal text knowledge</h3>
          </div>
          <p className="mt-2 text-xs leading-5 text-subtle">
            V1 accepts pasted text plus `.txt`, `.md`, `.html`, and `.json` file uploads. PDF extraction can be layered in next.
          </p>
          <div className="mt-3 space-y-3">
            <input
              value={docForm.title}
              onChange={(event) => setDocForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Source title"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text placeholder:text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <input
              type="file"
              accept=".txt,.md,.html,.json,text/plain,text/markdown,text/html,application/json"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                setDocForm((current) => ({
                  ...current,
                  title: current.title || file.name,
                  fileName: file.name,
                  fileType: file.type || "text/plain",
                  documentBody: text,
                }));
              }}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text file:mr-3 file:rounded-lg file:border-0 file:bg-accent/10 file:px-3 file:py-1.5 file:text-accent-light"
            />
            <textarea
              value={docForm.documentBody}
              onChange={(event) => setDocForm((current) => ({ ...current, documentBody: event.target.value }))}
              placeholder="Paste internal policy, FAQ, or support note text here..."
              rows={7}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text placeholder:text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={docForm.fileName}
                onChange={(event) => setDocForm((current) => ({ ...current, fileName: event.target.value }))}
                placeholder="File label"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text placeholder:text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <select
                value={docForm.visibility}
                onChange={(event) => setDocForm((current) => ({ ...current, visibility: event.target.value as KnowledgeVisibility }))}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="internal">Internal</option>
                <option value="public">Public</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={busyKey !== null || !docForm.title.trim() || !docForm.documentBody.trim() || !canMutate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm text-white transition-all hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50"
            >
              {busyKey === "add_document" ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              Add document
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <h3 className="text-sm font-semibold text-text">Registered sources</h3>
          <div className="mt-3 space-y-3">
            {sourceSummary.length ? sourceSummary.map((source) => (
              <div key={source.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text">{source.title}</p>
                    <p className="mt-1 text-xs text-subtle">
                      {source.source_type === "url" ? source.canonical_url : source.file_name || "Internal text source"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-subtle">
                    <span className="rounded-full border border-border px-2 py-1">{source.source_type}</span>
                    <span className="rounded-full border border-border px-2 py-1">{source.status}</span>
                    <span className="rounded-full border border-border px-2 py-1">{source.visibility}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-subtle">
                  <span>{source.chunk_count ?? 0} chunks</span>
                  <span>•</span>
                  <span>{source.last_synced_at ? new Date(source.last_synced_at).toLocaleString() : "Not synced yet"}</span>
                </div>
                {source.last_error ? <p className="mt-3 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">{source.last_error}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void runAction("sync_source", { sourceId: source.id }, "Source sync completed.")}
                    disabled={busyKey !== null || source.status === "archived" || !canMutate}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text transition-all hover:border-accent/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50"
                  >
                    {busyKey === "sync_source" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                    Sync now
                  </button>
                  <button
                    type="button"
                    onClick={() => void runAction("archive", { sourceId: source.id }, "Source archived.")}
                    disabled={busyKey !== null || source.status === "archived" || !canMutate}
                    className="inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 disabled:opacity-50"
                  >
                    <Archive size={12} />
                    Archive
                  </button>
                </div>
              </div>
            )) : <p className="text-sm text-subtle">No knowledge sources yet.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <h3 className="text-sm font-semibold text-text">Recent sync runs</h3>
          <div className="mt-3 space-y-3">
            {snapshot?.runs?.length ? snapshot.runs.map((run) => (
              <div key={run.id} className="rounded-xl border border-border bg-card px-3 py-3 text-sm text-subtle">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-text">{run.source_title || "Bulk sync"}</p>
                  <span className="text-[11px] uppercase tracking-wide">{run.status}</span>
                </div>
                <p className="mt-1 text-xs">{new Date(run.started_at).toLocaleString()}</p>
                <p className="mt-2 text-xs">{run.documents_processed} docs • {run.chunks_created} chunks • {run.mode}</p>
                {run.error_message ? <p className="mt-2 text-xs text-danger">{run.error_message}</p> : null}
              </div>
            )) : <p className="text-sm text-subtle">No sync runs yet.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}


import { createHash } from "crypto";
import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  getEmbeddingModel,
  getKnowledgeChunkOverlap,
  getKnowledgeChunkSize,
  getKnowledgeRetrievalLimit,
  isSupabaseConfigured,
} from "@/app/lib/env";
import { getRedisClient } from "@/app/lib/redis";
import { createSupabaseServiceRoleClient } from "@/app/lib/supabase/service-role";
import type {
  ChatConfidence,
  KnowledgeSourceRecord,
  KnowledgeVisibility,
  RetrievalMatch,
  SourceReference,
} from "@/types";

const FAQ_LIBRARY = [
  {
    key: "login_access",
    keywords: ["login", "password", "portal", "lms", "sign in", "access"],
    title: "Login and LMS access checklist",
    body:
      "Try these steps first:\n- Use your registered learner email and reset the password only once.\n- Open the portal in a private window to clear stale sessions.\n- Wait a few minutes after any password reset or enrollment update before signing in again.\n\nIf you are still blocked, share your student ID or registered email and I can guide the next step.",
  },
  {
    key: "course_access",
    keywords: ["course", "class link", "module", "recording", "not visible", "missing"],
    title: "Course visibility troubleshooting",
    body:
      "Here is the fastest course-access checklist:\n- Sign out of the LMS and log back in from the learner portal.\n- Wait 15 minutes if your payment, enrollment, or batch assignment was updated recently.\n- Confirm the class date has started and the live link has been published for that session.\n\nIf the course is still missing, share the program or batch name and the missing module or class date.",
  },
  {
    key: "schedule",
    keywords: ["schedule", "batch", "timetable", "timings", "mentor", "session time"],
    title: "Schedule readiness check",
    body:
      "To confirm your schedule quickly, keep your batch ID or program name ready and tell me whether you need the next session or the full weekly timetable. If your batch changed recently, mention both the previous and new batch names.",
  },
  {
    key: "fees",
    keywords: ["payment", "invoice", "receipt", "fee", "charged", "billing"],
    title: "Payment issue checklist",
    body:
      "For payment issues, keep the invoice ID or payment reference ready and confirm whether the amount was deducted, still pending, or only missing from the portal. If you only need a receipt, mention the delivery email too.",
  },
  {
    key: "certificate",
    keywords: ["certificate", "bonafide", "completion", "internship letter", "grade report"],
    title: "Certificate request prep",
    body:
      "Please confirm the exact document type you need, the delivery preference, and any deadline. That lets support process certificate and official-letter requests much faster.",
  },
] as const;

const DEMO_SOURCE_ROWS: KnowledgeSourceRecord[] = [
  {
    id: "demo-login-guide",
    source_type: "document",
    title: "Learner Login Support Playbook",
    status: "ready",
    visibility: "internal",
    file_name: "login-playbook.md",
    file_type: "text/markdown",
    checksum: "demo-login",
    chunk_count: 2,
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-course-guide",
    source_type: "document",
    title: "Course Access Troubleshooting",
    status: "ready",
    visibility: "internal",
    file_name: "course-access.md",
    file_type: "text/markdown",
    checksum: "demo-course",
    chunk_count: 2,
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-payment-guide",
    source_type: "document",
    title: "Fee and Receipt Resolution Guide",
    status: "ready",
    visibility: "internal",
    file_name: "payments.md",
    file_type: "text/markdown",
    checksum: "demo-payment",
    chunk_count: 2,
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
] as const;

const DEMO_MATCHES: RetrievalMatch[] = [
  {
    chunkId: "demo-login-1",
    sourceId: "demo-login-guide",
    sourceTitle: "Learner Login Support Playbook",
    sourceType: "document",
    sourceLabel: "login-playbook.md",
    heading: "Password and portal access",
    content:
      "Learners who cannot log in should verify they are using the registered learner email, then retry in a private browsing window. Password resets should be used once, followed by a short wait for the portal sync to complete.",
    keywordScore: 0.92,
    similarityScore: 0.84,
    combinedScore: 0.89,
  },
  {
    chunkId: "demo-course-1",
    sourceId: "demo-course-guide",
    sourceTitle: "Course Access Troubleshooting",
    sourceType: "document",
    sourceLabel: "course-access.md",
    heading: "Missing classes and modules",
    content:
      "If a course or live class link is missing, ask the learner to sign out and back in, wait 15 minutes after any payment or batch update, and confirm the batch start date and class publication status.",
    keywordScore: 0.9,
    similarityScore: 0.8,
    combinedScore: 0.86,
  },
  {
    chunkId: "demo-payment-1",
    sourceId: "demo-payment-guide",
    sourceTitle: "Fee and Receipt Resolution Guide",
    sourceType: "document",
    sourceLabel: "payments.md",
    heading: "Receipts and pending payment reflection",
    content:
      "For payment issues, collect the invoice ID, payment reference, amount, and payment date. If the amount was deducted but not reflected, finance review should be logged with those details and the learner should be told the review SLA.",
    keywordScore: 0.94,
    similarityScore: 0.82,
    combinedScore: 0.9,
  },
];

type SyncSourceInput = {
  id?: string;
  title: string;
  visibility: KnowledgeVisibility;
  canonicalUrl?: string;
  fileName?: string;
  fileType?: string;
  documentBody?: string;
};

function checksum(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeWhitespace(value: string) {
  return value.replace(/\r/g, "").replace(/\t/g, " ").replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function stripHtml(html: string) {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
  );
}

function estimateTokens(value: string) {
  return Math.ceil(value.length / 4);
}

function splitIntoChunks(text: string) {
  const chunkSize = getKnowledgeChunkSize();
  const overlap = Math.min(getKnowledgeChunkOverlap(), Math.floor(chunkSize / 3));
  const sections = normalizeWhitespace(text)
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);

  const chunks: Array<{ heading?: string; path?: string; content: string; checksum: string; tokenEstimate: number }> = [];
  let cursor = "";
  let heading = "";
  let index = 0;

  for (const section of sections) {
    const isHeading = section.length < 90 && !/[.!?]$/.test(section);
    if (isHeading) {
      heading = section;
      continue;
    }

    const next = cursor ? `${cursor}\n\n${section}` : section;
    if (next.length <= chunkSize || !cursor) {
      cursor = next;
      continue;
    }

    const content = cursor.trim();
    chunks.push({
      heading: heading || undefined,
      path: `section-${index + 1}`,
      content,
      checksum: checksum(content),
      tokenEstimate: estimateTokens(content),
    });
    index += 1;
    cursor = overlap > 0 ? `${content.slice(Math.max(0, content.length - overlap))}\n\n${section}` : section;
  }

  if (cursor.trim()) {
    const content = cursor.trim();
    chunks.push({
      heading: heading || undefined,
      path: `section-${index + 1}`,
      content,
      checksum: checksum(content),
      tokenEstimate: estimateTokens(content),
    });
  }

  return chunks;
}

async function fetchSourceText(source: Pick<KnowledgeSourceRecord, "source_type" | "canonical_url" | "file_name" | "file_type"> & { document_body?: string | null }) {
  if (source.source_type === "document") {
    return normalizeWhitespace(source.document_body || "");
  }

  if (!source.canonical_url) {
    throw new Error("URL source is missing canonical_url.");
  }

  const response = await fetch(source.canonical_url, {
    headers: {
      "User-Agent": "skl8-knowledge-sync/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch ${source.canonical_url}: ${response.status}`);
  }

  const html = await response.text();
  return stripHtml(html);
}

function toSourceReference(match: RetrievalMatch): SourceReference {
  return {
    id: match.sourceId,
    title: match.sourceTitle,
    label: match.sourceLabel,
    href: match.sourceUrl,
    sourceType: match.sourceType,
  };
}

function scoreTextMatch(query: string, content: string) {
  const tokens = query.toLowerCase().split(/\W+/).filter((token) => token.length > 2);
  if (tokens.length === 0) return 0;
  const haystack = content.toLowerCase();
  let matches = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) matches += 1;
  }
  return matches / tokens.length;
}

function mergeMatches(vectorMatches: RetrievalMatch[], keywordMatches: RetrievalMatch[]) {
  const merged = new Map<string, RetrievalMatch>();

  for (const match of [...vectorMatches, ...keywordMatches]) {
    const existing = merged.get(match.chunkId);
    if (!existing) {
      merged.set(match.chunkId, match);
      continue;
    }

    merged.set(match.chunkId, {
      ...existing,
      keywordScore: Math.max(existing.keywordScore, match.keywordScore),
      similarityScore: Math.max(existing.similarityScore, match.similarityScore),
      combinedScore: Math.max(existing.combinedScore, match.combinedScore),
    });
  }

  return [...merged.values()].sort((left, right) => right.combinedScore - left.combinedScore).slice(0, getKnowledgeRetrievalLimit());
}

async function maybeAcquireSyncLock(key: string) {
  const redis = getRedisClient();
  if (!redis) return true;
  await redis.connect().catch(() => undefined);
  const result = await redis.set(`knowledge-sync:${key}`, "1", "EX", 120, "NX");
  return result === "OK";
}

async function releaseSyncLock(key: string) {
  const redis = getRedisClient();
  if (!redis) return;
  await redis.connect().catch(() => undefined);
  await redis.del(`knowledge-sync:${key}`);
}

function getFaqIntent(query: string) {
  const lowered = query.toLowerCase();
  return FAQ_LIBRARY.find((item) => item.keywords.some((keyword) => lowered.includes(keyword)));
}

export function maybeBuildFaqResponse(query: string) {
  const intent = getFaqIntent(query);
  if (!intent) return null;

  return {
    message: `## ${intent.title}\n\n${intent.body}`,
    grounded: true,
    confidence: "high" as ChatConfidence,
    sources: [
      {
        id: `faq-${intent.key}`,
        title: intent.title,
        label: "Guided support checklist",
        sourceType: "faq" as const,
      },
    ],
  };
}

export async function createKnowledgeSource(input: SyncSourceInput, createdBy?: string) {
  if (!isSupabaseConfigured()) {
    return { ok: true, source: { ...DEMO_SOURCE_ROWS[0], title: input.title } };
  }

  const supabase = createSupabaseServiceRoleClient();
  const payload = {
    source_type: input.canonicalUrl ? "url" : "document",
    title: input.title,
    visibility: input.visibility,
    canonical_url: input.canonicalUrl || null,
    file_name: input.fileName || null,
    file_type: input.fileType || null,
    document_body: input.documentBody || null,
    status: "draft",
    created_by: createdBy || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("knowledge_sources")
    .upsert(input.id ? { ...payload, id: input.id } : payload)
    .select("id, source_type, title, status, visibility, canonical_url, file_name, file_type, checksum, chunk_count, last_synced_at, last_error, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true, source: data as KnowledgeSourceRecord };
}

export async function archiveKnowledgeSource(sourceId: string) {
  if (!isSupabaseConfigured()) {
    return { ok: true };
  }

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("knowledge_sources")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", sourceId);

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}

export async function getKnowledgeSnapshot() {
  if (!isSupabaseConfigured()) {
    return {
      mode: "demo" as const,
      counts: {
        sources: DEMO_SOURCE_ROWS.length,
        chunks: DEMO_MATCHES.length,
        last24hSyncs: 1,
      },
      sources: DEMO_SOURCE_ROWS,
      runs: [
        {
          id: "demo-run-1",
          status: "success",
          mode: "bulk",
          documents_processed: 3,
          chunks_created: DEMO_MATCHES.length,
          started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 59 * 60 * 1000).toISOString(),
        },
      ],
    };
  }

  const supabase = createSupabaseServiceRoleClient();
  const [sourcesResult, runsResult, sourcesCount, chunksCount, syncCount] = await Promise.all([
    supabase
      .from("knowledge_sources")
      .select("id, source_type, title, status, visibility, canonical_url, file_name, file_type, checksum, chunk_count, last_synced_at, last_error, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("knowledge_sync_runs")
      .select("id, source_id, status, mode, documents_processed, chunks_created, error_message, started_at, completed_at, knowledge_sources(title)")
      .order("started_at", { ascending: false })
      .limit(12),
    supabase.from("knowledge_sources").select("id", { count: "exact", head: true }),
    supabase.from("knowledge_chunks").select("id", { count: "exact", head: true }),
    supabase.from("knowledge_sync_runs").select("id", { count: "exact", head: true }).gte("started_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const firstError = [sourcesResult.error, runsResult.error, sourcesCount.error, chunksCount.error, syncCount.error].find(Boolean);
  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    mode: "supabase" as const,
    counts: {
      sources: sourcesCount.count ?? 0,
      chunks: chunksCount.count ?? 0,
      last24hSyncs: syncCount.count ?? 0,
    },
    sources: (sourcesResult.data ?? []) as KnowledgeSourceRecord[],
    runs: (runsResult.data ?? []).map((run: unknown) => {
      const runRecord = run as Record<string, unknown> & { knowledge_sources?: { title?: string } | null };
      return {
        ...runRecord,
        source_title: runRecord.knowledge_sources?.title ?? null,
      };
    }),
  };
}

async function embedChunkTexts(values: string[]) {
  if (!process.env.OPENAI_API_KEY) {
    return values.map(() => null);
  }

  const result = await embedMany({
    model: openai.embedding(getEmbeddingModel()),
    values,
  });

  return result.embeddings;
}

export async function syncKnowledgeSource(sourceId: string) {
  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      mode: "demo" as const,
      chunksCreated: DEMO_MATCHES.length,
      documentsProcessed: 1,
    };
  }

  const lockAcquired = await maybeAcquireSyncLock(sourceId);
  if (!lockAcquired) {
    throw new Error("This source is already syncing.");
  }

  const supabase = createSupabaseServiceRoleClient();
  let runId: string | null = null;

  try {
    const { data: source, error: sourceError } = await supabase
      .from("knowledge_sources")
      .select("id, source_type, title, visibility, canonical_url, file_name, file_type, document_body, checksum")
      .eq("id", sourceId)
      .single();

    if (sourceError || !source) {
      throw new Error(sourceError?.message || "Knowledge source not found.");
    }

    const { data: run, error: runError } = await supabase
      .from("knowledge_sync_runs")
      .insert({ source_id: sourceId, status: "running", mode: "single" })
      .select("id")
      .single();

    if (runError) {
      throw new Error(runError.message);
    }

    runId = run.id as string;

    await supabase
      .from("knowledge_sources")
      .update({ status: "syncing", last_error: null, updated_at: new Date().toISOString() })
      .eq("id", sourceId);

    const rawText = await fetchSourceText(source as typeof source & { document_body?: string | null });
    if (!rawText) {
      throw new Error("No usable text was extracted from this source.");
    }

    const sourceChecksum = checksum(rawText);
    if (source.checksum && source.checksum === sourceChecksum) {
      await Promise.all([
        supabase
          .from("knowledge_sources")
          .update({ status: "ready", last_error: null, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", sourceId),
        supabase
          .from("knowledge_sync_runs")
          .update({ status: "success", documents_processed: 0, chunks_created: 0, completed_at: new Date().toISOString() })
          .eq("id", runId),
      ]);

      return { ok: true, mode: "supabase" as const, chunksCreated: 0, documentsProcessed: 0 };
    }

    const chunks = splitIntoChunks(rawText);
    const embeddings = await embedChunkTexts(chunks.map((chunk) => chunk.content));

    const { data: documentRow, error: documentError } = await supabase
      .from("knowledge_documents")
      .insert({
        source_id: sourceId,
        checksum: sourceChecksum,
        raw_text: rawText,
        metadata: {
          title: source.title,
          source_type: source.source_type,
        },
      })
      .select("id")
      .single();

    if (documentError || !documentRow) {
      throw new Error(documentError?.message || "Unable to create knowledge document.");
    }

    await supabase.from("knowledge_chunks").delete().eq("source_id", sourceId);

    const insertRows = chunks.map((chunk, index) => ({
      source_id: sourceId,
      document_id: documentRow.id,
      chunk_index: index,
      heading: chunk.heading || null,
      path: chunk.path || null,
      content: chunk.content,
      token_estimate: chunk.tokenEstimate,
      checksum: chunk.checksum,
      embedding: embeddings[index],
    }));

    const { error: chunkError } = await supabase.from("knowledge_chunks").insert(insertRows);
    if (chunkError) {
      throw new Error(chunkError.message);
    }

    await Promise.all([
      supabase
        .from("knowledge_sources")
        .update({
          status: "ready",
          checksum: sourceChecksum,
          chunk_count: chunks.length,
          last_synced_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sourceId),
      supabase
        .from("knowledge_sync_runs")
        .update({
          status: "success",
          documents_processed: 1,
          chunks_created: chunks.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId),
    ]);

    return { ok: true, mode: "supabase" as const, chunksCreated: chunks.length, documentsProcessed: 1 };
  } catch (error) {
    if (isSupabaseConfigured()) {
      const supabase = createSupabaseServiceRoleClient();
      await supabase
        .from("knowledge_sources")
        .update({ status: "error", last_error: String(error), updated_at: new Date().toISOString() })
        .eq("id", sourceId);

      if (runId) {
        await supabase
          .from("knowledge_sync_runs")
          .update({ status: "error", error_message: String(error), completed_at: new Date().toISOString() })
          .eq("id", runId);
      }
    }

    throw error;
  } finally {
    await releaseSyncLock(sourceId);
  }
}

export async function syncAllKnowledgeSources() {
  if (!isSupabaseConfigured()) {
    return { ok: true, synced: DEMO_SOURCE_ROWS.length, mode: "demo" as const };
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("knowledge_sources")
    .select("id")
    .neq("status", "archived")
    .order("updated_at", { ascending: true })
    .limit(25);

  if (error) {
    throw new Error(error.message);
  }

  let synced = 0;
  for (const source of data ?? []) {
    await syncKnowledgeSource(source.id as string);
    synced += 1;
  }

  return { ok: true, synced, mode: "supabase" as const };
}

export async function retrieveKnowledge(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return [] as RetrievalMatch[];
  }

  if (!isSupabaseConfigured()) {
    return DEMO_MATCHES
      .map((match) => ({
        ...match,
        keywordScore: scoreTextMatch(trimmed, `${match.heading || ""} ${match.content}`),
        combinedScore: (match.combinedScore + scoreTextMatch(trimmed, `${match.heading || ""} ${match.content}`)) / 2,
      }))
      .filter((match) => match.keywordScore > 0.12)
      .sort((left, right) => right.combinedScore - left.combinedScore)
      .slice(0, getKnowledgeRetrievalLimit());
  }

  const supabase = createSupabaseServiceRoleClient();
  const limit = getKnowledgeRetrievalLimit();
  const keywordPromise = supabase.rpc("search_knowledge_chunks", {
    query_text: trimmed,
    match_count: Math.max(limit, 3),
  });

  const vectorPromise = process.env.OPENAI_API_KEY
    ? embed({ model: openai.embedding(getEmbeddingModel()), value: trimmed })
        .then((embeddingResult) =>
          supabase.rpc("match_knowledge_chunks", {
            query_embedding: embeddingResult.embedding,
            match_count: Math.max(limit, 3),
          })
        )
    : Promise.resolve({ data: [], error: null } as { data: unknown[]; error: null });

  const [keywordResult, vectorResult] = await Promise.all([keywordPromise, vectorPromise]);

  const keywordError = "error" in keywordResult ? keywordResult.error : null;
  const vectorError = "error" in vectorResult ? vectorResult.error : null;
  if (keywordError) {
    throw new Error(keywordError.message);
  }
  if (vectorError) {
    throw new Error(vectorError.message);
  }

  const keywordMatches = ((keywordResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    chunkId: String(row.chunk_id),
    sourceId: String(row.source_id),
    sourceTitle: String(row.source_title),
    sourceType: String(row.source_type) as RetrievalMatch["sourceType"],
    sourceUrl: row.source_url ? String(row.source_url) : undefined,
    sourceLabel: String(row.source_label),
    heading: row.heading ? String(row.heading) : undefined,
    content: String(row.content),
    keywordScore: Number(row.rank ?? 0),
    similarityScore: 0,
    combinedScore: Number(row.rank ?? 0),
  }));

  const vectorMatches = ((vectorResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    chunkId: String(row.chunk_id),
    sourceId: String(row.source_id),
    sourceTitle: String(row.source_title),
    sourceType: String(row.source_type) as RetrievalMatch["sourceType"],
    sourceUrl: row.source_url ? String(row.source_url) : undefined,
    sourceLabel: String(row.source_label),
    heading: row.heading ? String(row.heading) : undefined,
    content: String(row.content),
    keywordScore: 0,
    similarityScore: Number(row.similarity ?? 0),
    combinedScore: Number(row.similarity ?? 0),
  }));

  return mergeMatches(vectorMatches, keywordMatches);
}

export function buildGroundingSummary(matches: RetrievalMatch[]) {
  const citations = new Map<string, SourceReference>();
  for (const match of matches) {
    citations.set(match.sourceId, toSourceReference(match));
  }

  const evidence = matches.map((match, index) => {
    const heading = match.heading ? `${match.heading}: ` : "";
    return `[${index + 1}] ${heading}${match.content}`;
  });

  const topScore = matches[0]?.combinedScore ?? 0;
  const confidence: ChatConfidence = topScore >= 0.78 ? "high" : topScore >= 0.42 ? "medium" : "low";

  return {
    evidence,
    sources: [...citations.values()],
    grounded: matches.length > 0 && topScore >= 0.2,
    confidence,
  };
}





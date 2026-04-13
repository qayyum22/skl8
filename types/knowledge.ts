export type KnowledgeSourceType = "url" | "document";
export type KnowledgeSourceStatus = "draft" | "ready" | "syncing" | "error" | "archived";
export type KnowledgeVisibility = "public" | "internal";
export type KnowledgeSyncStatus = "pending" | "running" | "success" | "error";

export interface KnowledgeSourceRecord {
  id: string;
  source_type: KnowledgeSourceType;
  title: string;
  status: KnowledgeSourceStatus;
  visibility: KnowledgeVisibility;
  canonical_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  checksum?: string | null;
  chunk_count?: number;
  last_synced_at?: string | null;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDocumentRecord {
  id: string;
  source_id: string;
  checksum: string;
  raw_text: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface KnowledgeSyncRunRecord {
  id: string;
  source_id?: string | null;
  source_title?: string | null;
  status: KnowledgeSyncStatus;
  mode: "single" | "bulk";
  documents_processed: number;
  chunks_created: number;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
}

export interface RetrievalMatch {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: KnowledgeSourceType;
  sourceUrl?: string;
  sourceLabel: string;
  heading?: string;
  content: string;
  keywordScore: number;
  similarityScore: number;
  combinedScore: number;
}
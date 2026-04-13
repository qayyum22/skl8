const requiredClientEnv = [
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
] as const;

export function isSupabaseConfigured() {
  return requiredClientEnv.every(Boolean);
}

export function isRedisConfigured() {
  return Boolean(process.env.REDIS_URL);
}

export function requireSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!publishableKey) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }

  return { url, publishableKey };
}

export function requireSupabaseServiceRole() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return serviceRoleKey;
}

export function getGenerationModel() {
  return process.env.OPENAI_GENERATION_MODEL || "gpt-5.4-nano";
}

export function getEmbeddingModel() {
  return process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
}

export function getKnowledgeChunkSize() {
  const value = Number(process.env.KNOWLEDGE_CHUNK_SIZE || "1200");
  return Number.isFinite(value) && value >= 400 ? value : 1200;
}

export function getKnowledgeChunkOverlap() {
  const value = Number(process.env.KNOWLEDGE_CHUNK_OVERLAP || "180");
  return Number.isFinite(value) && value >= 0 ? value : 180;
}

export function getKnowledgeRetrievalLimit() {
  const value = Number(process.env.KNOWLEDGE_RETRIEVAL_LIMIT || "5");
  return Number.isFinite(value) && value >= 1 ? Math.min(value, 8) : 5;
}


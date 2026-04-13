import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/app/lib/env";
import {
  archiveKnowledgeSource,
  createKnowledgeSource,
  getKnowledgeSnapshot,
  syncAllKnowledgeSources,
  syncKnowledgeSource,
} from "@/app/lib/knowledge";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import type { AppRole, KnowledgeVisibility } from "@/types";

function formatKnowledgeSchemaError(error: unknown) {
  const message = String(error);

  if (
    message.includes("knowledge_sources") ||
    message.includes("knowledge_documents") ||
    message.includes("knowledge_chunks") ||
    message.includes("knowledge_sync_runs") ||
    message.includes("search_knowledge_chunks") ||
    message.includes("match_knowledge_chunks") ||
    message.includes("schema cache")
  ) {
    return "The knowledge-base schema is not installed in Supabase yet. Run `supabase/knowledge-rag-patch.sql` or re-run `supabase/schema.sql`, then refresh this page.";
  }

  return message;
}

async function getAdminSupabase() {
  if (!isSupabaseConfigured()) {
    return { demo: true } as const;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: NextResponse.json({ error: profileError.message }, { status: 500 }) } as const;
  }

  if (!profile || profile.role !== "admin") {
    return { error: NextResponse.json({ error: "Admin access required." }, { status: 403 }) } as const;
  }

  return { user, role: profile.role as AppRole } as const;
}

export async function GET() {
  const auth = await getAdminSupabase();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const snapshot = await getKnowledgeSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json({ error: formatKnowledgeSchemaError(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAdminSupabase();
  if ("error" in auth) {
    return auth.error;
  }

  const body = (await request.json()) as {
    action?: "add_url" | "add_document" | "sync_source" | "sync_all";
    sourceId?: string;
    title?: string;
    canonicalUrl?: string;
    visibility?: KnowledgeVisibility;
    fileName?: string;
    fileType?: string;
    documentBody?: string;
  };

  try {
    const createdBy = "demo" in auth ? undefined : auth.user.id;

    if (body.action === "add_url") {
      if (!body.title || !body.canonicalUrl) {
        return NextResponse.json({ error: "Title and URL are required." }, { status: 400 });
      }

      const created = await createKnowledgeSource(
        {
          title: body.title,
          canonicalUrl: body.canonicalUrl,
          visibility: body.visibility || "public",
        },
        createdBy
      );

      return NextResponse.json({ ok: true, source: created.source, message: "URL source added." });
    }

    if (body.action === "add_document") {
      if (!body.title || !body.documentBody) {
        return NextResponse.json({ error: "Title and document content are required." }, { status: 400 });
      }

      const created = await createKnowledgeSource(
        {
          title: body.title,
          visibility: body.visibility || "internal",
          fileName: body.fileName,
          fileType: body.fileType,
          documentBody: body.documentBody,
        },
        createdBy
      );

      return NextResponse.json({ ok: true, source: created.source, message: "Document source added." });
    }

    if (body.action === "sync_source") {
      if (!body.sourceId) {
        return NextResponse.json({ error: "sourceId is required." }, { status: 400 });
      }

      const result = await syncKnowledgeSource(body.sourceId);
      return NextResponse.json({ ...result, message: "Source sync completed." });
    }

    if (body.action === "sync_all") {
      const result = await syncAllKnowledgeSources();
      return NextResponse.json({ ...result, message: "Knowledge sync completed." });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: formatKnowledgeSchemaError(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await getAdminSupabase();
  if ("error" in auth) {
    return auth.error;
  }

  const body = (await request.json()) as { sourceId?: string; action?: "archive" };
  if (body.action !== "archive" || !body.sourceId) {
    return NextResponse.json({ error: "sourceId and archive action are required." }, { status: 400 });
  }

  try {
    await archiveKnowledgeSource(body.sourceId);
    return NextResponse.json({ ok: true, message: "Source archived." });
  } catch (error) {
    return NextResponse.json({ error: formatKnowledgeSchemaError(error) }, { status: 500 });
  }
}

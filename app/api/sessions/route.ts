import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/app/lib/env";
import { reviveSession, serializeSession } from "@/app/lib/session-utils";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import type { ChatSession, PersistedSessionRecord } from "@/types";

async function getAuthedSupabase() {
  if (!isSupabaseConfigured()) {
    return { error: NextResponse.json({ error: "Supabase is not configured." }, { status: 503 }) } as const;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  }

  return { supabase, user } as const;
}

export async function GET() {
  const auth = await getAuthedSupabase();
  if ("error" in auth) {
    return auth.error;
  }

  const { supabase } = auth;
  const { data, error } = await supabase
    .from("support_sessions")
    .select("id, title, created_at, updated_at, messages, satisfaction, owner_user_id, owner_role, agent_case")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sessions = (data ?? []).map((row) => reviveSession(row as PersistedSessionRecord));
  return NextResponse.json({ sessions });
}

async function upsertSession(request: NextRequest) {
  const auth = await getAuthedSupabase();
  if ("error" in auth) {
    return auth.error;
  }

  const { supabase, user } = auth;
  const body = (await request.json()) as { session?: ChatSession };

  if (!body.session) {
    return NextResponse.json({ error: "Session payload is required." }, { status: 400 });
  }

  const payload = serializeSession({
    ...body.session,
    ownerUserId: body.session.ownerUserId ?? user.id,
  });

  const { data, error } = await supabase
    .from("support_sessions")
    .upsert(payload)
    .select("id, title, created_at, updated_at, messages, satisfaction, owner_user_id, owner_role, agent_case")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: reviveSession(data as PersistedSessionRecord) });
}

export async function POST(request: NextRequest) {
  return upsertSession(request);
}

export async function PUT(request: NextRequest) {
  return upsertSession(request);
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthedSupabase();
  if ("error" in auth) {
    return auth.error;
  }

  const { supabase } = auth;
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Session id is required." }, { status: 400 });
  }

  const { error } = await supabase.from("support_sessions").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

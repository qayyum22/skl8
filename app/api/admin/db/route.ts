import { NextRequest, NextResponse } from "next/server";
import { createSeedSessions, serializeSession } from "@/app/lib/session-utils";
import { isSupabaseConfigured } from "@/app/lib/env";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import type { AppRole } from "@/types";

async function getAdminSupabase() {
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

  return { supabase, user, role: profile.role as AppRole } as const;
}

export async function GET() {
  const auth = await getAdminSupabase();
  if ("error" in auth) {
    return auth.error;
  }

  const { supabase } = auth;
  const [profileCount, sessionCount, recentProfiles, recentSessions] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("support_sessions").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id, full_name, role, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("support_sessions").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(5),
  ]);

  const errors = [profileCount.error, sessionCount.error, recentProfiles.error, recentSessions.error].filter(Boolean);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0]?.message || "Unable to load database stats." }, { status: 500 });
  }

  return NextResponse.json({
    counts: {
      profiles: profileCount.count ?? 0,
      sessions: sessionCount.count ?? 0,
    },
    recentProfiles: recentProfiles.data ?? [],
    recentSessions: recentSessions.data ?? [],
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAdminSupabase();
  if ("error" in auth) {
    return auth.error;
  }

  const { supabase, user } = auth;
  const body = (await request.json()) as { action?: "seed_sessions" | "clear_sessions" };

  if (body.action === "seed_sessions") {
    const payload = createSeedSessions().map((session) =>
      serializeSession({
        ...session,
        ownerUserId: user.id,
        ownerRole: "customer",
      })
    );

    const { error } = await supabase.from("support_sessions").upsert(payload);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Seeded support sessions into Postgres." });
  }

  if (body.action === "clear_sessions") {
    const { error } = await supabase.from("support_sessions").delete().neq("id", "");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Cleared support sessions from Postgres." });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

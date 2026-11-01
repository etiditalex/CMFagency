import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRequestAuthClient, hasSupabaseAuthCookie } from "@/lib/auth/session-cookies";
import { checkApplicationTrackRateLimit, getClientIp } from "@/lib/rate-limit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

type ApplicationRow = {
  id: string;
  cmf_agency_id: string | null;
  application_type: string | null;
  status: string | null;
  name: string | null;
  full_name: string | null;
  created_at: string | null;
  notes: string | null;
  comments: string | null;
};

function publicApplication(app: ApplicationRow, includeNotes: boolean) {
  return {
    id: app.id,
    cmfAgencyId: app.cmf_agency_id,
    applicationType: app.application_type,
    status: app.status || "pending",
    name: app.name || app.full_name,
    submittedAt: app.created_at,
    ...(includeNotes ? { notes: app.notes || app.comments } : {}),
  };
}

async function sessionUserId(request: NextRequest): Promise<string | null> {
  if (!hasSupabaseAuthCookie(request)) return null;
  try {
    const supabase = createRequestAuthClient(request, () => {});
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many lookups. Please wait and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Application tracking is unavailable." }, { status: 500 });
    }

    const body = (await request.json().catch(() => null)) as {
      method?: unknown;
      value?: unknown;
    } | null;
    const method = typeof body?.method === "string" ? body.method : "";
    const value = typeof body?.value === "string" ? body.value.trim() : "";

    if (!method && !value) {
      const userId = await sessionUserId(request);
      if (!userId) {
        return NextResponse.json({ error: "Sign in to see your applications." }, { status: 401 });
      }

      const { data, error } = await supabaseAdmin
        .from("applications")
        .select("id,cmf_agency_id,application_type,status,name,full_name,created_at,notes,comments")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error querying applications by session:", error);
        return NextResponse.json({ error: "Failed to query applications" }, { status: 500 });
      }

      if (!data || data.length === 0) {
        return NextResponse.json({ error: "No applications found for this user" }, { status: 404 });
      }

      const applications = (data as ApplicationRow[]).map((app) => publicApplication(app, true));
      return NextResponse.json({
        success: true,
        applications,
        application: applications[0],
      });
    }

    const limit = checkApplicationTrackRateLimit(getClientIp(request));
    if (!limit.allowed) return tooMany(limit.retryAfter ?? 900);

    if (!method || !value) {
      return NextResponse.json({ error: "Method and value are required" }, { status: 400 });
    }

    let application: ApplicationRow | null = null;

    if (method === "nationalId") {
      if (!/^[0-9A-Za-z]{5,20}$/.test(value)) {
        return NextResponse.json({ error: "Enter a valid national ID." }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from("applications")
        .select("id,cmf_agency_id,application_type,status,name,full_name,created_at,notes,comments")
        .eq("national_id", value)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("Error querying by national ID:", error);
        return NextResponse.json({ error: "Failed to query application" }, { status: 500 });
      }
      application = (data as ApplicationRow | null) ?? null;
    } else if (method === "phoneNumber") {
      const phoneNumber = value.replace(/[\s-]/g, "");
      if (!/^\+?[0-9]{9,15}$/.test(phoneNumber)) {
        return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
      }

      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("phone", phoneNumber)
        .limit(1)
        .maybeSingle();

      if (userData?.id) {
        const { data, error } = await supabaseAdmin
          .from("applications")
          .select("id,cmf_agency_id,application_type,status,name,full_name,created_at,notes,comments")
          .eq("user_id", userData.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) console.error("Error querying application by user:", error);
        else application = (data as ApplicationRow | null) ?? null;
      }

      if (!application) {
        const { data, error } = await supabaseAdmin
          .from("applications")
          .select("id,cmf_agency_id,application_type,status,name,full_name,created_at,notes,comments")
          .eq("phone", phoneNumber)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) console.error("Error querying by phone:", error);
        else application = (data as ApplicationRow | null) ?? null;
      }
    } else if (method === "cmfAgencyId") {
      const agencyId = value.toUpperCase();
      if (!/^CMF-\d{9}$/.test(agencyId)) {
        return NextResponse.json({ error: "Enter a valid CMF Agency ID." }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from("applications")
        .select("id,cmf_agency_id,application_type,status,name,full_name,created_at,notes,comments")
        .eq("cmf_agency_id", agencyId)
        .maybeSingle();
      if (error) {
        console.error("Error querying by CMF Agency ID:", error);
        return NextResponse.json({ error: "Failed to query application" }, { status: 500 });
      }
      application = (data as ApplicationRow | null) ?? null;
    } else {
      return NextResponse.json({ error: "Method and value are required" }, { status: 400 });
    }

    if (!application) {
      return NextResponse.json(
        { error: "No application found with the provided information" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      application: publicApplication(application, false),
    });
  } catch (error: unknown) {
    console.error("Track application error:", error);
    return NextResponse.json(
      { error: "An error occurred while tracking your application" },
      { status: 500 }
    );
  }
}

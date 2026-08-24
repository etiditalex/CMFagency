import { NextRequest, NextResponse } from "next/server";

import {
  applyCookiesToResponse,
  clearSupabaseAuthCookies,
  createRequestAuthClient,
  type CookieToSet,
} from "@/lib/auth/session-cookies";

function collectClient(req: NextRequest) {
  const cookiesToSet: CookieToSet[] = [];
  let extraHeaders: Record<string, string> = {};
  const supabase = createRequestAuthClient(req, (cookies, headers) => {
    cookiesToSet.push(...cookies);
    extraHeaders = { ...extraHeaders, ...headers };
  });
  return { supabase, cookiesToSet, extraHeaders };
}

/** Hydrate the in-memory supabase client from httpOnly session cookies. */
export async function GET(req: NextRequest) {
  try {
    const { supabase, cookiesToSet, extraHeaders } = collectClient(req);
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      const response = NextResponse.json({ value: null });
      applyCookiesToResponse(response, cookiesToSet, extraHeaders);
      return response;
    }
    const { data } = await supabase.auth.getSession();
    const response = NextResponse.json({
      value: data.session ? JSON.stringify(data.session) : null,
    });
    applyCookiesToResponse(response, cookiesToSet, extraHeaders);
    return response;
  } catch {
    return NextResponse.json({ value: null });
  }
}

/** Persist a refreshed session into httpOnly cookies (token refresh / OAuth). */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { value?: string };
    const raw = typeof body.value === "string" ? body.value : "";
    if (!raw) return NextResponse.json({ ok: false, error: "Missing session" }, { status: 400 });

    let accessToken = "";
    let refreshToken = "";
    try {
      const parsed = JSON.parse(raw) as {
        access_token?: string;
        refresh_token?: string;
        currentSession?: { access_token?: string; refresh_token?: string };
      };
      accessToken = String(parsed.access_token ?? parsed.currentSession?.access_token ?? "");
      refreshToken = String(parsed.refresh_token ?? parsed.currentSession?.refresh_token ?? "");
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 400 });
    }
    if (!accessToken || !refreshToken) {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 400 });
    }

    const { supabase, cookiesToSet, extraHeaders } = collectClient(req);
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    applyCookiesToResponse(response, cookiesToSet, extraHeaders);
    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, cookiesToSet, extraHeaders } = collectClient(req);
    await supabase.auth.signOut();
    const response = NextResponse.json({ ok: true });
    applyCookiesToResponse(response, cookiesToSet, extraHeaders);
    clearSupabaseAuthCookies(req, response);
    return response;
  } catch {
    const response = NextResponse.json({ ok: true });
    clearSupabaseAuthCookies(req, response);
    return response;
  }
}

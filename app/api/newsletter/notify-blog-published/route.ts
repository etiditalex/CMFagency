import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { listNewsletterSubscriberEmails } from "@/lib/newsletter-subscribers";
import { sendNewBlogPostNotificationEmails } from "@/lib/send-new-blog-post-emails";

async function getCallerAdminRole(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { role: null as string | null };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return { role: null as string | null };

  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return { role: null as string | null };

  const userId = String(userData.user.id ?? "");
  if (!userId) return { role: null as string | null };

  try {
    const { data: memberRow, error: memberErr } = await admin
      .from("portal_members")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberErr) {
      const msg = String(memberErr.message ?? "").toLowerCase();
      const code = String((memberErr as { code?: string }).code ?? "");
      const missingPortal = code === "42P01" || (msg.includes("portal_members") && msg.includes("does not exist"));
      if (missingPortal) {
        const { data: legacyAdminRow } = await admin
          .from("admin_users")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();
        return { role: legacyAdminRow ? "admin" : null };
      }
      return { role: null };
    }

    return { role: String(memberRow?.role ?? "") || null };
  } catch {
    return { role: null };
  }
}

export async function POST(req: NextRequest) {
  const { role } = await getCallerAdminRole(req);
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const slug = typeof (body as { slug?: unknown })?.slug === "string" ? (body as { slug: string }).slug.trim() : "";
  if (!slug) {
    return NextResponse.json({ ok: false, error: "slug is required" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Server misconfigured" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: post, error: postErr } = await admin
    .from("fusion_blogs")
    .select("slug, title, excerpt, published_at")
    .eq("slug", slug)
    .maybeSingle();

  if (postErr || !post?.published_at) {
    return NextResponse.json({ ok: false, error: "Published post not found" }, { status: 404 });
  }

  const list = await listNewsletterSubscriberEmails();
  if (!list.ok) {
    return NextResponse.json({ ok: false, error: list.error }, { status: 500 });
  }

  if (list.emails.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0, message: "No subscribers yet" });
  }

  const { sent, failed } = await sendNewBlogPostNotificationEmails({
    recipients: list.emails,
    postTitle: String(post.title ?? ""),
    postExcerpt: post.excerpt ? String(post.excerpt) : null,
    postSlug: String(post.slug ?? slug),
  });

  return NextResponse.json({ ok: true, sent, failed, total: list.emails.length });
}

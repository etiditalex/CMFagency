import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { APPLICATION_DOCS_BUCKET } from "@/lib/application-documents";

const ALLOWED_FIELDS = new Set([
  "idFront",
  "idBack",
  "passportPhoto",
  "certificateOfGoodConduct",
  "cv",
]);

async function requireAdminOrManager(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: NextResponse.json({ error: "Missing authorization" }, { status: 401 }) };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { error: NextResponse.json({ error: "Server configuration error" }, { status: 500 }) };
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !callerData?.user) {
    return { error: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };
  }

  const callerId = String(callerData.user.id ?? "");
  const { data: memberRow } = await admin.from("portal_members").select("role").eq("user_id", callerId).maybeSingle();
  const isManager = memberRow?.role === "manager";
  const isAdmin = memberRow?.role === "admin";
  const isLegacyAdmin = !memberRow
    ? (await admin.from("admin_users").select("user_id").eq("user_id", callerId).maybeSingle()).data != null
    : false;

  if (!isAdmin && !isManager && !isLegacyAdmin) {
    return { error: NextResponse.json({ error: "Forbidden: admin or manager access required" }, { status: 403 }) };
  }

  return { admin };
}

/**
 * GET: short-lived signed URL to download one application file (private bucket).
 * Query: field=idFront|idBack|passportPhoto|certificateOfGoodConduct|cv
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const { id } = await params;
    const field = req.nextUrl.searchParams.get("field")?.trim() ?? "";
    if (!id || !ALLOWED_FIELDS.has(field)) {
      return NextResponse.json(
        { error: "Missing or invalid field (use idFront, idBack, passportPhoto, certificateOfGoodConduct, cv)" },
        { status: 400 }
      );
    }

    const { data: row, error: fetchErr } = await admin.from("applications").select("documents").eq("id", id).single();
    if (fetchErr || !row) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const docs = row.documents as Record<string, { storagePath?: string } | undefined> | null;
    const entry = docs?.[field];
    const storagePath = entry?.storagePath;
    if (!storagePath || typeof storagePath !== "string") {
      return NextResponse.json({ error: "No stored file for this field" }, { status: 404 });
    }

    const { data: signed, error: signErr } = await admin.storage
      .from(APPLICATION_DOCS_BUCKET)
      .createSignedUrl(storagePath, 3600);

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json(
        { error: signErr?.message ?? "Could not create download link" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      url: signed.signedUrl,
      expiresIn: 3600,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

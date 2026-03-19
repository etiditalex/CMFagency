import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB to keep data URLs manageable
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

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
      const code = String((memberErr as any).code ?? "");
      const missingPortal = code === "42P01" || (msg.includes("portal_members") && msg.includes("does not exist"));
      if (missingPortal) {
        const { data: legacyAdminRow } = await admin.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing or invalid file" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Invalid file type. Use: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Max 2MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  return NextResponse.json({ url: dataUrl });
}


import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * Uploads image and returns a data URL (base64) for storage in the database.
 * Images are stored directly in campaigns.image_url and contestants.image_url
 * as data URLs (data:image/xxx;base64,...), no external storage required.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey)
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });

  if (!token)
    return NextResponse.json({ error: "Unauthorized: missing session" }, { status: 401 });

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(token);
  if (authErr || !user)
    return NextResponse.json({ error: "Unauthorized: invalid or expired session" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File))
    return NextResponse.json({ error: "Missing or invalid file" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json(
      { error: `Invalid file type. Use: ${ALLOWED_TYPES.join(", ")}` },
      { status: 400 }
    );
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  return NextResponse.json({ url: dataUrl });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "campaign-images";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey)
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

  const ext = file.name.split(".").pop() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext.toLowerCase()) ? ext.toLowerCase() : "jpg";
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET);
    if (!exists) {
      await supabase.storage.createBucket(BUCKET, { public: true });
    }
  } catch {
    // Bucket may already exist or creation failed; proceed with upload
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return NextResponse.json({ url: urlData.publicUrl });
}

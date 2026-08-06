import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { uploadCampaignImage } from "@/lib/campaign-image-storage";

/**
 * Uploads campaign/contestant artwork to Supabase Storage and returns its public URL.
 * The URL is what gets written to `campaigns.image_url` / `contestants.image_url`.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceKey)
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

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const result = await uploadCampaignImage(admin, file, "uploads");

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ url: result.url });
}

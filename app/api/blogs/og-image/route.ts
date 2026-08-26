import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { DEFAULT_BLOG_SHARE_IMAGE } from "@/lib/blog-share-image";
import { resolveSafeImageRedirectUrl } from "@/lib/safe-image-redirect";

const MAX_BYTES = 4 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(DEFAULT_BLOG_SHARE_IMAGE);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase
    .from("fusion_blogs")
    .select("image_url")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .maybeSingle();

  if (error || !data?.image_url) {
    return NextResponse.redirect(DEFAULT_BLOG_SHARE_IMAGE);
  }

  const raw = String(data.image_url).trim();

  const safeRedirect = resolveSafeImageRedirectUrl(raw);
  if (safeRedirect) {
    return NextResponse.redirect(safeRedirect);
  }

  const dataMatch = raw.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!dataMatch) {
    return NextResponse.redirect(DEFAULT_BLOG_SHARE_IMAGE);
  }

  const contentType = dataMatch[1];
  let buffer: Buffer;
  try {
    buffer = Buffer.from(dataMatch[2], "base64");
  } catch {
    return NextResponse.redirect(DEFAULT_BLOG_SHARE_IMAGE);
  }

  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    return NextResponse.redirect(DEFAULT_BLOG_SHARE_IMAGE);
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

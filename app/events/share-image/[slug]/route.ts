import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { EVENTS_BANNER_OG } from "@/lib/og-images";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;

const SITE_ORIGIN =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");

function galleryFirstString(gallery: unknown): string | null {
  if (!Array.isArray(gallery) || gallery.length === 0) return null;
  const g0 = gallery[0];
  return typeof g0 === "string" && g0.trim() ? g0.trim() : null;
}

function pickImageRaw(row: {
  image_url?: string | null;
  default_image_url?: string | null;
  gallery?: unknown;
}): string | null {
  const a = row.image_url?.trim();
  if (a) return a;
  const b = row.default_image_url?.trim();
  if (b) return b;
  return galleryFirstString(row.gallery);
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await context.params;
  const slug = decodeURIComponent(rawSlug || "").trim();
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(EVENTS_BANNER_OG.url);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase
    .from("fusion_events")
    .select("image_url, default_image_url, gallery")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.redirect(EVENTS_BANNER_OG.url);
  }

  const raw = pickImageRaw(data as { image_url?: string | null; default_image_url?: string | null; gallery?: unknown });
  if (!raw) {
    return NextResponse.redirect(EVENTS_BANNER_OG.url);
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return NextResponse.redirect(raw);
  }
  if (raw.startsWith("//")) {
    return NextResponse.redirect(`https:${raw}`);
  }
  if (raw.startsWith("/")) {
    return NextResponse.redirect(`${SITE_ORIGIN}${raw}`);
  }

  const dataMatch = raw.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!dataMatch) {
    return NextResponse.redirect(EVENTS_BANNER_OG.url);
  }

  const contentType = dataMatch[1];
  let buffer: Buffer;
  try {
    buffer = Buffer.from(dataMatch[2], "base64");
  } catch {
    return NextResponse.redirect(EVENTS_BANNER_OG.url);
  }

  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    return NextResponse.redirect(EVENTS_BANNER_OG.url);
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

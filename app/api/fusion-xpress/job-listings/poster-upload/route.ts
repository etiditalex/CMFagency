import { NextRequest, NextResponse } from "next/server";
import { requireEmployerOrAdminForJobBoard } from "@/lib/require-employer-or-admin";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB — same budget as managed page backgrounds
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * POST multipart form field "file" — returns { url } data URL for storing in job_listings.poster_url.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireEmployerOrAdminForJobBoard(req);
    if ("error" in auth) return auth.error;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing or invalid file" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Invalid type. Use: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Max 2MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({ url: dataUrl });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

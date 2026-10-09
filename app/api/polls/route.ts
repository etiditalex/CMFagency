import { NextResponse } from "next/server";
import { createPublicPoll, listFusionPolls } from "@/lib/fusion-polls-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const records = await listFusionPolls();
  if (!records) return NextResponse.json({ polls: null }, { status: 503 });
  return NextResponse.json({ polls: records.map((record) => record.poll) });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    description?: unknown;
    options?: unknown;
    ends?: unknown;
  } | null;
  const title = typeof body?.title === "string" ? body.title : "";
  const description = typeof body?.description === "string" ? body.description : "";
  const ends = typeof body?.ends === "string" ? body.ends : "";
  const options = Array.isArray(body?.options) ? body.options.filter((option): option is string => typeof option === "string") : [];
  const result = await createPublicPoll({ title, description, options, ends });
  if (!result.ok) {
    const status = result.error === "Polls are not connected." ? 503 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ id: result.id });
}

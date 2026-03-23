import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { getUnifiedJobBoardFeed } from "@/lib/job-board-feed";

const openaiKey = process.env.OPENAI_API_KEY;

type MatchRow = { id: string; source: string; score: number; reason: string };

function extractJsonArray(text: string): MatchRow[] | null {
  const t = text.trim();
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(t.slice(start, end + 1)) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: MatchRow[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : null;
      const source = typeof o.source === "string" ? o.source : null;
      const score = typeof o.score === "number" ? o.score : Number(o.score);
      const reason = typeof o.reason === "string" ? o.reason : "";
      if (id && source && Number.isFinite(score)) {
        out.push({ id, source, score, reason });
      }
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * AI-assisted ranking of unified job feed against a free-text profile (skills, goals, location).
 */
export async function POST(req: NextRequest) {
  if (!openaiKey) {
    return NextResponse.json(
      { error: "AI matching is not configured (set OPENAI_API_KEY)." },
      { status: 503 }
    );
  }

  try {
    const body = (await req.json().catch(() => null)) as { profileText?: string } | null;
    const profileText = String(body?.profileText ?? "").trim();
    if (profileText.length < 10) {
      return NextResponse.json(
        { error: "Please enter at least a short profile (skills, role, location)." },
        { status: 400 }
      );
    }

    const { jobs, error } = await getUnifiedJobBoardFeed({ limit: 80 });
    if (error === "Server configuration error") {
      return NextResponse.json({ error: error }, { status: 500 });
    }

    const pool = jobs.slice(0, 60).map((j) => ({
      id: j.id,
      source: j.source,
      title: j.title,
      company: j.company_name,
      location: j.location,
      snippet: (j.summary || j.title).slice(0, 220),
    }));

    if (pool.length === 0) {
      return NextResponse.json({ matches: [], message: "No jobs loaded yet. Run aggregate sync and try again." });
    }

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `You are a hiring assistant. Given the candidate profile and a fixed list of jobs, pick the best matches.

Candidate profile:
${profileText.slice(0, 4000)}

Jobs (JSON array; each job has id, source, title, company, location, snippet):
${JSON.stringify(pool)}

Rules:
- Return ONLY a JSON array (no markdown), max 12 items, sorted by score descending.
- Each item: {"id":"<uuid>","source":"<employer|remoteok|remotive|jobicy|adzuna>","score":<number 0-100>,"reason":"<one short sentence>"}
- Use only jobs from the provided list; id and source must match exactly.`,
    });

    const matches = extractJsonArray(text) ?? [];

    return NextResponse.json({ matches });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Match request failed" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { tavily } from "@tavily/core";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const tavilyApiKey = process.env.TAVILY_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

const tavilyClient = tavilyApiKey ? tavily({ apiKey: tavilyApiKey }) : null;

/** Max duration for Vercel serverless (seconds). Keep under plan limit. */
export const maxDuration = 30;

const SNIPPET_MAX_LEN = 400;

function toResearchError(error: unknown): { message: string; status: number } {
  const err = error as { message?: string; code?: string };
  const msg = String(err?.message ?? "Unknown error");
  const lower = msg.toLowerCase();

  if (msg.includes("401") || lower.includes("unauthorized") || (lower.includes("invalid") && lower.includes("key"))) {
    return { message: "Search or AI service reported an invalid API key. Please check TAVILY_API_KEY and OPENAI_API_KEY in your environment.", status: 500 };
  }
  if (msg.includes("429") || lower.includes("rate limit")) {
    return { message: "Rate limit exceeded. Please try again in a moment.", status: 429 };
  }
  if (lower.includes("timeout") || lower.includes("etimedout") || lower.includes("timed out")) {
    return { message: "Request took too long. Try a shorter or simpler query.", status: 504 };
  }
  if (lower.includes("enotfound") || lower.includes("econnrefused") || (lower.includes("fetch") && lower.includes("fail"))) {
    return { message: "Network error contacting search or AI service. Please try again.", status: 502 };
  }
  // Return a generic but safe message; full details stay in server logs
  return { message: "Research request failed. Try a different query or try again later.", status: 500 };
}

export async function POST(req: NextRequest) {
  try {
    if (!tavilyClient) {
      return NextResponse.json(
        { error: "Research is not configured. Missing Tavily API key." },
        { status: 500 },
      );
    }
    if (!openaiKey) {
      return NextResponse.json(
        { error: "Research is not configured. Missing OpenAI API key." },
        { status: 500 },
      );
    }

    const { query } = await req.json();
    const cleanedQuery = String(query || "").trim().slice(0, 500);

    if (!cleanedQuery) {
      return NextResponse.json(
        { error: "Query is required." },
        { status: 400 },
      );
    }

    let articles: { title: string; url: string; snippet: string }[];

    try {
      const searchResult = await tavilyClient.search(cleanedQuery, {
        maxResults: 4,
        searchDepth: "basic",
        includeAnswer: false,
        includeRawContent: false,
        timeout: 12_000,
      });

      articles =
        searchResult.results?.map((r) => ({
          title: r.title ?? "",
          url: r.url ?? "",
          snippet: (r.content ?? "").slice(0, SNIPPET_MAX_LEN),
        })) ?? [];
    } catch (searchErr) {
      console.error("Research Tavily search error:", searchErr);
      const { message, status } = toResearchError(searchErr);
      return NextResponse.json({ error: message }, { status });
    }

    const sourcesForPrompt = articles
      .map(
        (a, idx) =>
          `[${idx + 1}] ${a.title || "Untitled"}\nURL: ${a.url}\nSnippet: ${a.snippet || ""}`,
      )
      .join("\n\n");

    const system = `You are a research assistant for CMF Agency's public website.
You receive a user question and a set of fresh web search results.

- Provide a concise, well-structured answer in 2–4 short paragraphs or bullet points.
- Use only the provided sources; do not fabricate facts.
- At the end, list the sources as "Sources: [1], [2], ..." matching the numbered links shown to the user.
- If the sources do not answer the question, say so briefly and suggest refining the query.`;

    let text: string;
    try {
      const result = await generateText({
        model: openai("gpt-4o-mini"),
        system,
        messages: [
          {
            role: "user",
            content: `User question:\n${cleanedQuery}\n\nWeb results:\n${sourcesForPrompt}`,
          },
        ],
        maxOutputTokens: 500,
      });
      text = result.text.trim();
    } catch (aiErr) {
      console.error("Research OpenAI error:", aiErr);
      const { message, status } = toResearchError(aiErr);
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({
      answer: text,
      sources: articles.map((a, idx) => ({
        id: idx + 1,
        title: a.title || `Source ${idx + 1}`,
        url: a.url,
      })),
    });
  } catch (error) {
    console.error("Research API error:", error);
    const { message, status } = toResearchError(error);
    return NextResponse.json({ error: message }, { status });
  }
}


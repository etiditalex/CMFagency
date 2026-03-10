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

/** Extract a single string from various error shapes (Error, axios, API body). */
function getErrorMessage(error: unknown): string {
  const err = error as {
    message?: string;
    code?: string;
    response?: { status?: number; data?: { message?: string; error?: string; detail?: string } };
  };
  const parts: string[] = [];
  if (err?.message) parts.push(err.message);
  const data = err?.response?.data;
  if (data && typeof data === "object") {
    if (typeof data.detail === "string") parts.push(data.detail);
    else if (typeof data.message === "string") parts.push(data.message);
    else if (typeof data.error === "string") parts.push(data.error);
  }
  if (err?.code) parts.push(`[${err.code}]`);
  const combined = parts.join(" ").trim() || "Unknown error";
  // Strip anything that looks like an API key or token (avoid leaking in logs or response)
  return combined.replace(/\b(sk-[a-zA-Z0-9-]{20,}|tvly-[a-zA-Z0-9-]{20,})/gi, "[REDACTED]");
}

function toResearchError(error: unknown): { message: string; status: number } {
  const msg = getErrorMessage(error);
  const lower = msg.toLowerCase();
  const status = (error as { response?: { status?: number } })?.response?.status;

  if (status === 401 || msg.includes("401") || lower.includes("unauthorized") || (lower.includes("invalid") && lower.includes("key"))) {
    return { message: "Search or AI service reported an invalid API key. Check TAVILY_API_KEY and OPENAI_API_KEY in your environment.", status: 500 };
  }
  if (status === 402 || lower.includes("insufficient") || lower.includes("credit") || lower.includes("quota") || lower.includes("payment")) {
    return { message: "Search or AI service quota or credits exceeded. Check your Tavily and OpenAI account limits.", status: 502 };
  }
  if (status === 403 || lower.includes("forbidden")) {
    return { message: "Search or AI service access denied. Check your API keys and account permissions.", status: 502 };
  }
  if (status === 429 || msg.includes("429") || lower.includes("rate limit")) {
    return { message: "Rate limit exceeded. Please try again in a moment.", status: 429 };
  }
  if (status === 504 || lower.includes("timeout") || lower.includes("etimedout") || lower.includes("timed out") || lower.includes("econnreset")) {
    return { message: "Request took too long or connection was reset. Try a shorter query or try again.", status: 504 };
  }
  if (status === 502 || status === 503 || lower.includes("enotfound") || lower.includes("econnrefused") || lower.includes("econnreset") || (lower.includes("fetch") && lower.includes("fail"))) {
    return { message: "Network or server error contacting search or AI service. Please try again.", status: 502 };
  }
  // Include a short safe detail so user has a hint (e.g. "HTTP 500" or first part of message)
  const hint = status ? ` (HTTP ${status})` : msg.slice(0, 60).replace(/\s+/g, " ").trim();
  const suffix = hint && hint.length <= 70 ? hint : "";
  return { message: `Research request failed. Try again or a different query.${suffix}`, status: 500 };
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
      const extracted = getErrorMessage(searchErr);
      console.error("Research Tavily search error:", extracted, searchErr);
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
      const extracted = getErrorMessage(aiErr);
      console.error("Research OpenAI error:", extracted, aiErr);
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
    console.error("Research API error:", getErrorMessage(error), error);
    const { message, status } = toResearchError(error);
    return NextResponse.json({ error: message }, { status });
  }
}


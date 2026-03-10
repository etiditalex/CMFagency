import { NextRequest, NextResponse } from "next/server";
import { tavily } from "@tavily/core";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const tavilyApiKey = process.env.TAVILY_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

const tavilyClient = tavilyApiKey ? tavily({ apiKey: tavilyApiKey }) : null;

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
    const cleanedQuery = String(query || "").trim();

    if (!cleanedQuery) {
      return NextResponse.json(
        { error: "Query is required." },
        { status: 400 },
      );
    }

    const searchResult = await tavilyClient.search(cleanedQuery, {
      maxResults: 6,
      includeAnswer: false,
      includeRawContent: false,
    });

    const articles =
      searchResult.results?.map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
      })) ?? [];

    const sourcesForPrompt = articles
      .map(
        (a, idx) =>
          `[${idx + 1}] ${a.title || "Untitled"}\nURL: ${a.url}\nSnippet: ${
            a.snippet || ""
          }`,
      )
      .join("\n\n");

    const system = `You are a research assistant for CMF Agency's public website.
You receive a user question and a set of fresh web search results.

- Provide a concise, well-structured answer.
- Use only the provided sources; do not fabricate facts.
- When useful, highlight key takeaways as bullet points.
- At the end, list the sources as "Sources: [1], [2], ..." referring to the numbered links that will be shown to the user.
- If the sources do not actually answer the question, say so clearly and suggest how the user might refine their query.`;

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system,
      messages: [
        {
          role: "user",
          content: `User question:\n${cleanedQuery}\n\nWeb results:\n${sourcesForPrompt}`,
        },
      ],
      maxOutputTokens: 600,
    });

    return NextResponse.json({
      answer: text.trim(),
      sources: articles.map((a, idx) => ({
        id: idx + 1,
        title: a.title || `Source ${idx + 1}`,
        url: a.url,
      })),
    });
  } catch (error) {
    const err = error as { message?: string; response?: { status?: number }; code?: string };
    const message = err?.message ?? "";
    console.error("Research API error:", err);

    // Sanitize for client: hint at cause without exposing internals
    if (message.includes("401") || message.includes("Unauthorized") || (message.toLowerCase().includes("invalid") && message.toLowerCase().includes("key"))) {
      return NextResponse.json(
        { error: "Tavily or OpenAI API key is invalid or expired. Check TAVILY_API_KEY and OPENAI_API_KEY in your environment." },
        { status: 500 },
      );
    }
    if (message.includes("429") || message.includes("rate limit")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in a moment." },
        { status: 429 },
      );
    }
    if (message.includes("ENOTFOUND") || message.includes("fetch") && message.toLowerCase().includes("fail")) {
      return NextResponse.json(
        { error: "Network error while contacting search or AI service. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "An error occurred while performing research. Check server logs for details." },
      { status: 500 },
    );
  }
}


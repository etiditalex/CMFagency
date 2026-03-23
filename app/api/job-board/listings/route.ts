import { NextResponse } from "next/server";
import { getPublishedJobListings } from "@/lib/job-board-listings";

/**
 * Public list of published job listings (summary fields only).
 */
export async function GET() {
  try {
    const { listings, error } = await getPublishedJobListings();
    if (error === "Server configuration error") {
      return NextResponse.json({ error: error }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }
    return NextResponse.json({ listings });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrManager } from "@/lib/fusion-require-admin";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrManager(req);
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const nominationId = String(id ?? "").trim();
  if (!nominationId) {
    return NextResponse.json({ error: "Missing nomination id" }, { status: 400 });
  }

  const { error } = await auth.admin
    .from("model_nominations")
    .delete()
    .eq("id", nominationId);

  if (error) {
    console.error("Delete nomination error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete nomination" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

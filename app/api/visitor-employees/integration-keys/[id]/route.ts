import { NextRequest, NextResponse } from "next/server";

import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";
import { resolveAdminOwnerScope } from "@/lib/visitors/admin-business-scope";
import { adminOwnerScopeErrorResponse } from "@/lib/visitors/admin-business-scope-api";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    const scope = await resolveAdminOwnerScope(
      admin,
      isAdmin,
      userId,
      req.nextUrl.searchParams.get("owner")
    );
    if (!scope.ok) {
      return adminOwnerScopeErrorResponse(scope)!;
    }

    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Missing key id." }, { status: 400 });
    }

    const { data, error } = await admin
      .from("visitor_integration_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id.trim())
      .eq("owner_id", scope.ownerId)
      .is("revoked_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Key not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

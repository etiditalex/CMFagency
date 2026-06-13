import { NextRequest, NextResponse } from "next/server";

import {
  generateIntegrationApiKey,
  INTEGRATION_SCOPES,
  normalizeIntegrationScopes,
} from "@/lib/integrations/api-key";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";
import { resolveAdminOwnerScope } from "@/lib/visitors/admin-business-scope";
import { adminOwnerScopeErrorResponse } from "@/lib/visitors/admin-business-scope-api";

function safeName(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s.slice(0, 80) || "Integration";
}

export async function GET(req: NextRequest) {
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

    const { data, error } = await admin
      .from("visitor_integration_api_keys")
      .select("id,owner_id,name,key_prefix,scopes,last_used_at,revoked_at,created_at")
      .eq("owner_id", scope.ownerId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      const msg = String(error.message ?? "").toLowerCase();
      if (msg.includes("visitor_integration_api_keys") || msg.includes("does not exist")) {
        return NextResponse.json({
          keys: [],
          setupRequired: true,
          message: "Run database/visitor_employees_patch_13_integration_api.sql in Supabase.",
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const keys = (data ?? []).map(
      (row: {
        id: string;
        name: string;
        key_prefix: string;
        scopes: string[];
        last_used_at: string | null;
        created_at: string;
      }) => ({
        id: row.id,
        name: row.name,
        keyPrefix: row.key_prefix,
        scopes: row.scopes ?? [],
        lastUsedAt: row.last_used_at,
        createdAt: row.created_at,
      })
    );

    return NextResponse.json({ keys, availableScopes: [...INTEGRATION_SCOPES] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const name = safeName(body.name);
    const scopes = normalizeIntegrationScopes(body.scopes);
    const { rawKey, keyPrefix, keyHash } = generateIntegrationApiKey();

    const { data, error } = await admin
      .from("visitor_integration_api_keys")
      .insert({
        owner_id: scope.ownerId,
        name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        scopes,
      })
      .select("id,name,key_prefix,scopes,created_at")
      .single();

    if (error) {
      const msg = String(error.message ?? "").toLowerCase();
      if (msg.includes("visitor_integration_api_keys") || msg.includes("does not exist")) {
        return NextResponse.json(
          {
            error: "Run database/visitor_employees_patch_13_integration_api.sql in Supabase.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = data as {
      id: string;
      name: string;
      key_prefix: string;
      scopes: string[];
      created_at: string;
    };

    return NextResponse.json({
      key: rawKey,
      record: {
        id: row.id,
        name: row.name,
        keyPrefix: row.key_prefix,
        scopes: row.scopes ?? [],
        createdAt: row.created_at,
      },
      warning: "Copy this key now. It will not be shown again.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

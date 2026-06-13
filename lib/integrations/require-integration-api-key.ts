import { NextRequest, NextResponse } from "next/server";

import {
  hashIntegrationApiKey,
  parseIntegrationBearerToken,
  type IntegrationScope,
} from "@/lib/integrations/api-key";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

export type IntegrationApiKeyRow = {
  id: string;
  owner_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type IntegrationAuth =
  | {
      admin: NonNullable<ReturnType<typeof getVisitorServiceClient>>;
      ownerId: string;
      keyId: string;
      scopes: string[];
    }
  | { error: NextResponse };

export async function requireIntegrationApiKey(
  req: NextRequest,
  requiredScope?: IntegrationScope
): Promise<IntegrationAuth> {
  const rawKey = parseIntegrationBearerToken(req.headers.get("authorization"));
  if (!rawKey) {
    return {
      error: NextResponse.json(
        {
          error: "Missing or invalid API key. Use Authorization: Bearer fx_int_live_…",
        },
        { status: 401 }
      ),
    };
  }

  const admin = getVisitorServiceClient();
  if (!admin) {
    return { error: NextResponse.json({ error: "Server configuration error" }, { status: 500 }) };
  }

  const keyHash = hashIntegrationApiKey(rawKey);
  const { data, error } = await admin
    .from("visitor_integration_api_keys")
    .select("id,owner_id,name,key_prefix,scopes,last_used_at,revoked_at,created_at")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    const msg = String(error.message ?? "").toLowerCase();
    if (msg.includes("visitor_integration_api_keys") || msg.includes("does not exist")) {
      return {
        error: NextResponse.json(
          {
            error: "Integration API not set up. Run database/visitor_employees_patch_13_integration_api.sql.",
          },
          { status: 503 }
        ),
      };
    }
    return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  }

  if (!data) {
    return { error: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };
  }

  const row = data as IntegrationApiKeyRow;
  const scopes = Array.isArray(row.scopes) ? row.scopes.map(String) : [];

  if (requiredScope && !scopes.includes(requiredScope)) {
    return {
      error: NextResponse.json(
        { error: `API key missing required scope: ${requiredScope}` },
        { status: 403 }
      ),
    };
  }

  void admin
    .from("visitor_integration_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return {
    admin,
    ownerId: row.owner_id,
    keyId: row.id,
    scopes,
  };
}

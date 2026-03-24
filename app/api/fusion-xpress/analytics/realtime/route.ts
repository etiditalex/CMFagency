import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

export const dynamic = "force-dynamic";

function normalizePropertyId(raw: string | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  return s.replace(/^properties\//i, "");
}

function createAnalyticsClient(): BetaAnalyticsDataClient | null {
  const json = process.env.GA4_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    try {
      return new BetaAnalyticsDataClient({ credentials: JSON.parse(json) as object });
    } catch {
      return null;
    }
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new BetaAnalyticsDataClient();
  }
  return null;
}

type BreakdownRow = { label: string; value: number };

function mapRows(
  rows:
    | Array<{
        dimensionValues?: Array<{ value?: string | null } | null> | null;
        metricValues?: Array<{ value?: string | null } | null> | null;
      }>
    | null
    | undefined,
  dimIndex = 0,
  metricIndex = 0
): BreakdownRow[] {
  const out: BreakdownRow[] = [];
  for (const row of rows ?? []) {
    const label = row.dimensionValues?.[dimIndex]?.value ?? "—";
    const v = Number(row.metricValues?.[metricIndex]?.value ?? 0);
    out.push({ label, value: Number.isFinite(v) ? v : 0 });
  }
  return out;
}

/**
 * GET: GA4 realtime snapshot (admin portal only). Requires GA4_PROPERTY_ID and service account credentials.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Missing authorization" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !callerData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const callerId = String(callerData.user.id ?? "");
    const { data: memberRow } = await admin.from("portal_members").select("role").eq("user_id", callerId).maybeSingle();
    const isFullAdmin = memberRow?.role === "admin";
    const isLegacyAdmin =
      !memberRow &&
      (await admin.from("admin_users").select("user_id").eq("user_id", callerId).maybeSingle()).data != null;

    if (!isFullAdmin && !isLegacyAdmin) {
      return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }

    const propertyId = normalizePropertyId(process.env.GA4_PROPERTY_ID);
    const hasJson = Boolean(process.env.GA4_SERVICE_ACCOUNT_JSON?.trim());
    const hasFileCred = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);

    if (!propertyId || (!hasJson && !hasFileCred)) {
      return NextResponse.json({
        configured: false as const,
        message:
          "Set GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON (or GOOGLE_APPLICATION_CREDENTIALS locally). See .env.example.",
      });
    }

    const client = createAnalyticsClient();
    if (!client) {
      return NextResponse.json(
        {
          configured: false as const,
          message: "Invalid GA4_SERVICE_ACCOUNT_JSON: must be valid JSON for a Google Cloud service account key.",
        },
        { status: 500 }
      );
    }

    const property = `properties/${propertyId}`;

    const [totalTuple, pagesTuple, countriesTuple, devicesTuple] = await Promise.all([
      client.runRealtimeReport({
        property,
        metrics: [{ name: "activeUsers" }],
      }),
      client.runRealtimeReport({
        property,
        dimensions: [{ name: "pagePathPlusQueryString" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ desc: true, metric: { metricName: "activeUsers" } }],
        limit: 20,
      }),
      client.runRealtimeReport({
        property,
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ desc: true, metric: { metricName: "activeUsers" } }],
        limit: 15,
      }),
      client.runRealtimeReport({
        property,
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ desc: true, metric: { metricName: "activeUsers" } }],
        limit: 10,
      }),
    ]);

    const totalRes = totalTuple[0];
    const pagesRes = pagesTuple[0];
    const countriesRes = countriesTuple[0];
    const devicesRes = devicesTuple[0];

    const totalRow = totalRes?.rows?.[0];
    const activeUsersTotal = Number(totalRow?.metricValues?.[0]?.value ?? 0);

    return NextResponse.json({
      configured: true as const,
      fetchedAt: new Date().toISOString(),
      activeUsers: Number.isFinite(activeUsersTotal) ? activeUsersTotal : 0,
      byPage: mapRows(pagesRes?.rows),
      byCountry: mapRows(countriesRes?.rows),
      byDevice: mapRows(devicesRes?.rows),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    const isGaPermission =
      typeof msg === "string" &&
      (msg.includes("PERMISSION_DENIED") || msg.includes("403") || msg.includes("Google Analytics Data API has not been used"));
    return NextResponse.json(
      {
        error: isGaPermission
          ? "GA4 API denied. Enable Google Analytics Data API in Google Cloud, and add the service account email as Viewer on the GA4 property (Admin → Property access)."
          : msg,
      },
      { status: 502 }
    );
  }
}

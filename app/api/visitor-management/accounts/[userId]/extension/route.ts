import { NextRequest, NextResponse } from "next/server";

import {
  applyAdminSubscriptionExtension,
  isAdminExtensionActive,
  revokeAdminSubscriptionExtension,
  VISITOR_SUBSCRIPTION_SELECT_WITH_EXTENSION,
} from "@/lib/visitors/admin-subscription-extension";
import { requireAdminOrManager } from "@/lib/fusion-require-admin";
import { isMissingSubscriptionTable } from "@/lib/visitors/subscription-db";
import { mapSubscriptionRow, type VisitorSubscriptionRow } from "@/lib/visitors/subscription";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;

    const { userId } = await params;
    const ownerId = String(userId ?? "").trim();
    if (!ownerId) {
      return NextResponse.json({ error: "Missing account id." }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? "").trim().toLowerCase();

    if (action === "revoke" || action === "deactivate" || action === "off") {
      const subscription = await revokeAdminSubscriptionExtension(auth.admin, ownerId);
      return NextResponse.json({
        ok: true,
        subscription,
        extension: { active: false },
      });
    }

    if (action !== "activate" && action !== "extend") {
      return NextResponse.json(
        { error: 'Use action "activate" or "revoke".' },
        { status: 400 }
      );
    }

    const daysRaw = body.days ?? body.durationDays ?? 7;
    const days = Math.min(365, Math.max(1, Math.floor(Number(daysRaw) || 7)));
    const note = body.note ?? body.reason ?? null;

    const subscription = await applyAdminSubscriptionExtension(auth.admin, ownerId, {
      days,
      plan: "enterprise",
      note: typeof note === "string" ? note : null,
      grantedByUserId: auth.userId,
    });

    const { data: row } = await auth.admin
      .from("visitor_management_subscriptions")
      .select(VISITOR_SUBSCRIPTION_SELECT_WITH_EXTENSION)
      .eq("owner_id", ownerId)
      .maybeSingle();

    const extensionRow = row as VisitorSubscriptionRow | null;

    return NextResponse.json({
      ok: true,
      subscription,
      extension: {
        active: isAdminExtensionActive(extensionRow),
        endsAt: extensionRow?.admin_extension_ends_at ?? null,
        plan: extensionRow?.admin_extension_plan ?? "enterprise",
        note: extensionRow?.admin_extension_note ?? null,
        days,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    if (isMissingSubscriptionTable(e)) {
      return NextResponse.json(
        {
          error:
            "Run database/visitor_management_patch_09_admin_subscription_extensions.sql in Supabase.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;

    const { userId } = await params;
    const ownerId = String(userId ?? "").trim();
    if (!ownerId) {
      return NextResponse.json({ error: "Missing account id." }, { status: 400 });
    }

    const { data, error } = await auth.admin
      .from("visitor_management_subscriptions")
      .select(VISITOR_SUBSCRIPTION_SELECT_WITH_EXTENSION)
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) {
      if (isMissingSubscriptionTable(error)) {
        return NextResponse.json({ setupRequired: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = data as VisitorSubscriptionRow | null;
    const subscription = mapSubscriptionRow(row);

    return NextResponse.json({
      subscription,
      extension: {
        active: isAdminExtensionActive(row),
        endsAt: row?.admin_extension_ends_at ?? null,
        plan: row?.admin_extension_plan ?? null,
        note: row?.admin_extension_note ?? null,
        grantedAt: row?.admin_extension_granted_at ?? null,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

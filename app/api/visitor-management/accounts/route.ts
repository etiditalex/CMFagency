import { NextRequest, NextResponse } from "next/server";

import { isAdminExtensionActive } from "@/lib/visitors/admin-subscription-extension";
import { requireAdminOrManager } from "@/lib/fusion-require-admin";
import { hasPaidSubscription } from "@/lib/visitors/subscription-db";
import {
  mapSubscriptionRow,
  VISITOR_PLAN_LABELS,
  formatSubscriptionExpiryDate,
  type VisitorSubscriptionRow,
} from "@/lib/visitors/subscription";

function parseFeatures(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f) => String(f).toLowerCase().trim());
}

/**
 * GET: List client accounts signed up for Smart Visitor Management (admin/manager only).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const { data: members, error: pmErr } = await admin
      .from("portal_members")
      .select("user_id,role,features,created_at")
      .eq("role", "client")
      .order("created_at", { ascending: false });

    if (pmErr) return NextResponse.json({ error: pmErr.message }, { status: 500 });

    const rows = (members ?? []).filter((m) =>
      parseFeatures((m as { features?: unknown }).features).includes("visitor_management")
    );

    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const usersById = new Map(
      (usersData?.users ?? []).map((u) => [u.id, u] as const)
    );

    const userIds = rows.map((m) => String((m as { user_id: string }).user_id));
    const { data: subsData } = await admin
      .from("visitor_management_subscriptions")
      .select(
        "owner_id,plan,trial_ends_at,subscribed_at,billing_interval,current_period_ends_at,last_payment_reference,last_transaction_id,admin_extension_active,admin_extension_ends_at,admin_extension_plan,admin_extension_note,admin_extension_granted_at,created_at,updated_at"
      )
      .in("owner_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

    const subsByOwner = new Map(
      ((subsData ?? []) as VisitorSubscriptionRow[]).map((s) => [s.owner_id, s] as const)
    );

    const accounts = rows.map((m) => {
      const userId = String((m as { user_id: string }).user_id);
      const authUser = usersById.get(userId);
      const meta = (authUser?.user_metadata ?? {}) as Record<string, unknown>;
      const subRow = subsByOwner.get(userId) ?? null;
      const subscription = mapSubscriptionRow(subRow);
      const extensionActive = isAdminExtensionActive(subRow);
      const paid = hasPaidSubscription(subRow);

      return {
        user_id: userId,
        email: authUser?.email ?? "—",
        business_name: String(meta.business_name ?? "").trim() || "—",
        contact_name: String(meta.name ?? meta.contact_name ?? "").trim() || "—",
        organization_industry: String(meta.organization_industry ?? "").trim() || null,
        email_confirmed: Boolean(authUser?.email_confirmed_at),
        created_at: (m as { created_at?: string }).created_at ?? null,
        subscription: {
          plan: subscription.plan,
          planLabel: VISITOR_PLAN_LABELS[subscription.plan],
          isActive: subscription.isActive,
          isPaid: paid,
          periodEndsAt: subscription.currentPeriodEndsAt,
          periodEndsLabel: formatSubscriptionExpiryDate(subscription.currentPeriodEndsAt),
          trialEndsAt: subscription.trialEndsAt,
        },
        extension: {
          active: extensionActive,
          endsAt: subRow?.admin_extension_ends_at ?? null,
          endsLabel: formatSubscriptionExpiryDate(subRow?.admin_extension_ends_at),
          plan: subRow?.admin_extension_plan ?? null,
          note: subRow?.admin_extension_note ?? null,
        },
      };
    });

    return NextResponse.json({ accounts });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

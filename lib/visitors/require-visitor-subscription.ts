import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isVisitorDemoAccount } from "@/lib/visitors/demo-accounts";
import { resolveVisitorSubscriptionForOwner } from "@/lib/visitors/subscription-db";
import {
  planHasFeature,
  type VisitorPlanFeatureKey,
} from "@/lib/visitors/subscription";
import { VISITOR_MANAGEMENT_SUBSCRIPTION_PATH } from "@/lib/visitors/industry-options";

/** Returns an error response when subscription blocks the action; null when allowed. Platform admins skip checks. */
export async function assertVisitorSubscriptionAllows(
  admin: SupabaseClient,
  userId: string,
  isAdmin: boolean,
  feature: VisitorPlanFeatureKey,
  email?: string | null
): Promise<NextResponse | null> {
  if (isAdmin) return null;
  if (isVisitorDemoAccount(email)) return null;

  const subscription = await resolveVisitorSubscriptionForOwner(admin, userId, email);

  if (!subscription.isActive) {
    return NextResponse.json(
      {
        error:
          "Your free trial has ended. Subscribe via Settings → Subscription to continue.",
        subscriptionPath: VISITOR_MANAGEMENT_SUBSCRIPTION_PATH,
        subscriptionExpired: true,
      },
      { status: 402 }
    );
  }

  if (!planHasFeature(subscription.plan, feature, subscription.isActive)) {
    return NextResponse.json(
      {
        error: `This feature requires a paid plan. Upgrade via Settings → Subscription.`,
        subscriptionPath: VISITOR_MANAGEMENT_SUBSCRIPTION_PATH,
        upgradeRequired: true,
      },
      { status: 403 }
    );
  }

  return null;
}

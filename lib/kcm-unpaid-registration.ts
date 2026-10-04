import type { SupabaseClient } from "@supabase/supabase-js";

const STALE_PENDING_MS = 45 * 60 * 1000;

function isPaid(status: unknown, confirmed: unknown): boolean {
  return confirmed === true || String(status ?? "") === "success";
}

/** Removes a membership that never received a successful payment, and releases any registration ID on it. */
export async function discardUnpaidKcmMembership(admin: SupabaseClient, membershipId: string): Promise<void> {
  const { data } = await admin
    .from("kcm_memberships")
    .select("id,payment_status,payment_confirmed,status")
    .eq("id", membershipId)
    .maybeSingle();
  if (!data) return;
  const row = data as { payment_status?: string; payment_confirmed?: boolean; status?: string };
  if (isPaid(row.payment_status, row.payment_confirmed)) return;
  if (String(row.status ?? "") === "approved") return;

  await admin
    .from("kcm_memberships")
    .update({ membership_number: null })
    .eq("id", membershipId)
    .neq("payment_status", "success");
  await admin
    .from("kcm_memberships")
    .delete()
    .eq("id", membershipId)
    .neq("payment_status", "success")
    .neq("status", "approved");
}

/** Drops failed and abandoned registration attempts so only successful payments remain on file. */
export async function purgeUnsuccessfulKcmMemberships(admin: SupabaseClient): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_PENDING_MS).toISOString();
  const [{ data: failed }, { data: stale }] = await Promise.all([
    admin
      .from("kcm_memberships")
      .select("id,payment_status,payment_confirmed,status")
      .eq("payment_status", "failed")
      .neq("status", "approved")
      .limit(500),
    admin
      .from("kcm_memberships")
      .select("id,payment_status,payment_confirmed,status")
      .eq("payment_status", "pending")
      .neq("status", "approved")
      .lt("created_at", cutoff)
      .limit(500),
  ]);

  const ids = new Set<string>();
  for (const row of [...(failed ?? []), ...(stale ?? [])] as Array<{
    id: string;
    payment_status?: string;
    payment_confirmed?: boolean;
    status?: string;
  }>) {
    if (isPaid(row.payment_status, row.payment_confirmed)) continue;
    if (String(row.status ?? "") === "approved") continue;
    ids.add(String(row.id));
  }

  await admin
    .from("kcm_memberships")
    .update({ membership_number: null })
    .neq("payment_status", "success")
    .eq("payment_confirmed", false)
    .neq("status", "approved")
    .not("membership_number", "is", null);

  if (ids.size === 0) return;
  const idList = [...ids];
  await admin.from("kcm_memberships").update({ membership_number: null }).in("id", idList).neq("payment_status", "success");
  await admin.from("kcm_memberships").delete().in("id", idList).neq("payment_status", "success").neq("status", "approved");
}

export async function discardUnpaidForumRegistration(admin: SupabaseClient, registrationId: string): Promise<void> {
  const { data } = await admin
    .from("kenya_coast_models_registrations")
    .select("id,payment_status,payment_confirmed")
    .eq("id", registrationId)
    .maybeSingle();
  if (!data) return;
  const row = data as { payment_status?: string; payment_confirmed?: boolean };
  if (isPaid(row.payment_status, row.payment_confirmed)) return;
  await admin.from("kenya_coast_models_registrations").delete().eq("id", registrationId).neq("payment_status", "success");
}

export async function purgeUnsuccessfulForumRegistrations(admin: SupabaseClient): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_PENDING_MS).toISOString();
  const [{ data: failed }, { data: stale }] = await Promise.all([
    admin.from("kenya_coast_models_registrations").select("id").eq("payment_status", "failed").limit(500),
    admin
      .from("kenya_coast_models_registrations")
      .select("id")
      .eq("payment_status", "pending")
      .lt("created_at", cutoff)
      .limit(500),
  ]);
  const ids = [...(failed ?? []), ...(stale ?? [])].map((row) => String((row as { id: string }).id));
  if (ids.length === 0) return;
  await admin.from("kenya_coast_models_registrations").delete().in("id", ids).neq("payment_status", "success");
}

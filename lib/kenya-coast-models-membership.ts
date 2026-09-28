import type { SupabaseClient } from "@supabase/supabase-js";

export type ApprovedKcmMember = {
  id: string;
  membershipNumber: string;
  firstName: string;
  email: string;
};

/** Membership numbers are emailed as KCM/2026/001. Accept spaces, dashes, and a short sequence. */
export function normalizeMembershipNumber(raw: unknown): string | null {
  const compact = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "/")
    .replace(/\/+/g, "/");
  const match = compact.match(/^KCM\/(\d{4})\/(\d{1,6})$/);
  if (!match) return null;
  return `KCM/${match[1]}/${match[2].padStart(3, "0")}`;
}

export function splitForumName(fullName: string): { firstName: string; secondName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Member";
  const secondName = parts.slice(1).join(" ") || firstName;
  return { firstName, secondName };
}

export function forumFashionCategory(attendeeType: string, brandName: string | null): {
  fashion_category: "model" | "designer" | "other";
  fashion_category_other: string | null;
} {
  if (attendeeType === "model") return { fashion_category: "model", fashion_category_other: null };
  if (attendeeType === "designer") return { fashion_category: "designer", fashion_category_other: brandName || null };
  return { fashion_category: "other", fashion_category_other: brandName || "Guest" };
}

export async function findApprovedMemberByNumber(
  admin: SupabaseClient,
  rawNumber: unknown
): Promise<{ member: ApprovedKcmMember | null; error: string | null }> {
  const membershipNumber = normalizeMembershipNumber(rawNumber);
  if (!membershipNumber) {
    return { member: null, error: "Enter the membership number from your Kenya-Coast Models approval email, for example KCM/2026/001." };
  }

  const { data, error } = await admin
    .from("kcm_memberships")
    .select("id, membership_number, first_name, email, status")
    .eq("membership_number", membershipNumber)
    .maybeSingle();
  if (error) {
    const missing = error.code === "42703" || error.message.includes("membership_number");
    return {
      member: null,
      error: missing
        ? "Membership numbers are not set up yet. Run database/kcm_membership_number_patch.sql in Supabase."
        : error.message,
    };
  }
  if (!data) {
    return { member: null, error: "That membership number was not found. Use the number sent to your email when your membership was approved." };
  }
  const row = data as { id: string; membership_number: string; first_name: string; email: string; status: string };
  if (row.status === "rejected") {
    return { member: null, error: "This membership number is not active. Contact Kenya-Coast Models before registering." };
  }
  if (row.status !== "approved") {
    return { member: null, error: "This membership is not approved yet. The member ID is emailed only after approval." };
  }
  return {
    member: {
      id: row.id,
      membershipNumber: row.membership_number,
      firstName: row.first_name,
      email: row.email,
    },
    error: null,
  };
}

export async function findApprovedMemberByEmail(
  admin: SupabaseClient,
  email: string
): Promise<ApprovedKcmMember | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const { data } = await admin
    .from("kcm_memberships")
    .select("id, membership_number, first_name, email, status")
    .ilike("email", normalized)
    .eq("status", "approved")
    .not("membership_number", "is", null)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const row = data as { id: string; membership_number: string; first_name: string; email: string };
  return {
    id: row.id,
    membershipNumber: row.membership_number,
    firstName: row.first_name,
    email: row.email,
  };
}

type ForumRow = {
  id: string;
  full_name: string;
  phone_calls: string;
  email: string | null;
  is_member: boolean;
  membership_id: string | null;
  experience: string | null;
  attendee_type: string;
  brand_name: string | null;
  fee_kes: number;
  payment_status: string;
  mpesa_receipt: string | null;
  paid_at: string | null;
};

/** After a successful forum payment, non-members become a KCM membership row admins can approve. */
export async function ensureForumMembership(admin: SupabaseClient, registrationId: string): Promise<void> {
  const { data, error } = await admin
    .from("kenya_coast_models_registrations")
    .select(
      "id, full_name, phone_calls, email, is_member, membership_id, experience, attendee_type, brand_name, fee_kes, payment_status, mpesa_receipt, paid_at"
    )
    .eq("id", registrationId)
    .maybeSingle();
  if (error || !data) return;
  const row = data as ForumRow;
  if (row.payment_status !== "success" || row.is_member || row.membership_id || !row.email) return;

  const { data: existing } = await admin
    .from("kcm_memberships")
    .select("id")
    .eq("forum_registration_id", row.id)
    .maybeSingle();
  if (existing && (existing as { id?: string }).id) {
    await admin
      .from("kenya_coast_models_registrations")
      .update({ membership_id: (existing as { id: string }).id })
      .eq("id", row.id);
    return;
  }

  const { firstName, secondName } = splitForumName(row.full_name);
  const category = forumFashionCategory(row.attendee_type, row.brand_name);
  const { data: inserted, error: insertErr } = await admin
    .from("kcm_memberships")
    .insert({
      first_name: firstName,
      second_name: secondName,
      contact: row.phone_calls,
      email: row.email,
      experience: row.experience?.trim() || "Registered through the Sustainable Fashion & Models Empowerment Forum.",
      fashion_category: category.fashion_category,
      fashion_category_other: category.fashion_category_other,
      top_model_interest: false,
      payment_amount_kes: row.fee_kes,
      payment_confirmed: true,
      payment_status: "success",
      mpesa_receipt: row.mpesa_receipt,
      paid_at: row.paid_at ?? new Date().toISOString(),
      status: "new",
      review_notes: "Registered through the Kenya Coast Models forum. Approve to email their membership number.",
      forum_registration_id: row.id,
    })
    .select("id")
    .maybeSingle();

  let membershipId = (inserted as { id?: string } | null)?.id ?? null;
  if (insertErr && !membershipId) {
    const { data: again } = await admin.from("kcm_memberships").select("id").eq("forum_registration_id", row.id).maybeSingle();
    membershipId = (again as { id?: string } | null)?.id ?? null;
  }
  if (!membershipId) return;

  await admin.from("kenya_coast_models_registrations").update({ membership_id: membershipId }).eq("id", row.id);
}

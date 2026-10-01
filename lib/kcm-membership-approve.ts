import type { SupabaseClient } from "@supabase/supabase-js";

import {
  kcmMembershipCardPath,
  kcmMembershipCategoryLabel,
  type KcmMembershipCardData,
} from "@/lib/kcm-membership-card";
import { generateKcmMembershipCardPdf } from "@/lib/kcm-membership-card-pdf";
import { allocateKcmMembershipNumber } from "@/lib/kcm-membership-number";
import { sendKcmMembershipApprovedEmail } from "@/lib/send-kcm-membership-approved-email";

type MembershipRow = {
  id: string;
  status: string | null;
  payment_status: string | null;
  payment_confirmed: boolean | null;
  email: string | null;
  first_name: string | null;
  second_name: string | null;
  contact: string | null;
  fashion_category: string | null;
  fashion_category_other: string | null;
  membership_number: string | null;
  created_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
};

function isValidEmail(s: string): boolean {
  const v = s.trim();
  return v.includes("@") && v.includes(".") && v.length <= 254;
}

function publicSiteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
}

export type ApproveKcmResult = {
  ok: boolean;
  membershipNumber: string | null;
  emailed: boolean;
  alreadyApproved: boolean;
  error?: string;
};

async function loadMembership(admin: SupabaseClient, membershipId: string): Promise<MembershipRow | null> {
  const { data, error } = await admin
    .from("kcm_memberships")
    .select(
      "id,status,payment_status,payment_confirmed,email,first_name,second_name,contact,fashion_category,fashion_category_other,membership_number,created_at,approved_at,paid_at"
    )
    .eq("id", membershipId)
    .maybeSingle();
  if (error || !data) return null;
  return data as MembershipRow;
}

async function notifyApprovedMember(row: MembershipRow, membershipNumber: string): Promise<boolean> {
  const email = String(row.email ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) return false;

  const fullName = `${String(row.first_name ?? "").trim()} ${String(row.second_name ?? "").trim()}`.trim() || "Member";
  const card: KcmMembershipCardData = {
    membershipNumber,
    fullName,
    category: kcmMembershipCategoryLabel(row.fashion_category, row.fashion_category_other),
    contact: String(row.contact ?? "").trim() || "—",
    email,
    issuedOn: row.approved_at || row.paid_at || row.created_at || new Date().toISOString(),
  };
  const qrValue = `${publicSiteOrigin()}${kcmMembershipCardPath(membershipNumber)}`;

  let pdf: { filename: string; bytes: Uint8Array } | null = null;
  try {
    pdf = await generateKcmMembershipCardPdf({ card, qrValue });
  } catch {
    pdf = null;
  }

  const sent = await sendKcmMembershipApprovedEmail({
    to: email,
    firstName: String(row.first_name ?? "").trim() || "Member",
    membershipNumber,
    pdf,
  });
  return sent.ok;
}

/**
 * Marks a membership approved, assigns a member ID, and emails the card PDF.
 * Idempotent: already-approved members are not emailed again.
 */
export async function approveKcmMembershipAndNotify(
  admin: SupabaseClient,
  membershipId: string
): Promise<ApproveKcmResult> {
  const before = await loadMembership(admin, membershipId);
  if (!before) return { ok: false, membershipNumber: null, emailed: false, alreadyApproved: false, error: "not_found" };

  const prevStatus = String(before.status ?? "").trim();
  const existingNumber = String(before.membership_number ?? "").trim();
  if (prevStatus === "approved" && existingNumber) {
    return { ok: true, membershipNumber: existingNumber, emailed: false, alreadyApproved: true };
  }

  const now = new Date().toISOString();
  const { data: flipped } = await admin
    .from("kcm_memberships")
    .update({
      status: "approved",
      approved_at: before.approved_at || now,
      updated_at: now,
    })
    .eq("id", membershipId)
    .neq("status", "approved")
    .select("id")
    .maybeSingle();

  const membershipNumber = existingNumber || (await allocateKcmMembershipNumber(admin, membershipId));
  if (!membershipNumber) {
    return { ok: true, membershipNumber: null, emailed: false, alreadyApproved: !flipped, error: "membership_number_failed" };
  }

  const shouldEmail = Boolean(flipped) || (prevStatus === "approved" && !existingNumber);
  if (!shouldEmail) {
    return { ok: true, membershipNumber, emailed: false, alreadyApproved: true };
  }

  const after = (await loadMembership(admin, membershipId)) ?? before;
  const emailed = await notifyApprovedMember(after, membershipNumber);
  return { ok: true, membershipNumber, emailed, alreadyApproved: false };
}

/** Auto-approve only after a successful M-Pesa payment. Skips rejected rows. */
export async function approvePaidKcmMembershipIfNeeded(
  admin: SupabaseClient,
  membershipId: string
): Promise<ApproveKcmResult | null> {
  const row = await loadMembership(admin, membershipId);
  if (!row) return null;
  if (String(row.status ?? "") === "rejected") return null;
  const paid = row.payment_confirmed === true || String(row.payment_status ?? "") === "success";
  if (!paid) return null;
  return approveKcmMembershipAndNotify(admin, membershipId);
}

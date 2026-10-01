import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import { KcmMembershipCard } from "@/components/kcm/KcmMembershipCard";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import {
  kcmMembershipCardPath,
  kcmMembershipCategoryLabel,
  kcmMembershipNumberFromCardCode,
  type KcmMembershipCardData,
} from "@/lib/kcm-membership-card";
import { normalizeMembershipNumber } from "@/lib/kenya-coast-models-membership";

export const metadata: Metadata = {
  title: "KCM membership card",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function KcmMembershipCardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const membershipNumber = normalizeMembershipNumber(kcmMembershipNumberFromCardCode(code));
  if (!membershipNumber || !supabaseUrl || !supabaseServiceKey) notFound();

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin
    .from("kcm_memberships")
    .select(
      "membership_number,first_name,second_name,contact,email,fashion_category,fashion_category_other,status,approved_at,paid_at,created_at"
    )
    .eq("membership_number", membershipNumber)
    .maybeSingle();

  if (error || !data) notFound();
  const row = data as {
    membership_number: string;
    first_name: string;
    second_name: string;
    contact: string;
    email: string;
    fashion_category: string | null;
    fashion_category_other: string | null;
    status: string;
    approved_at: string | null;
    paid_at: string | null;
    created_at: string;
  };
  if (row.status !== "approved") notFound();

  const card: KcmMembershipCardData = {
    membershipNumber: row.membership_number,
    fullName: `${row.first_name} ${row.second_name}`.trim(),
    category: kcmMembershipCategoryLabel(row.fashion_category, row.fashion_category_other),
    contact: row.contact,
    email: row.email,
    issuedOn: row.approved_at || row.paid_at || row.created_at,
  };
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
  const qrValue = `${origin}${kcmMembershipCardPath(row.membership_number)}`;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f3f1ec] px-4 pb-28 pt-[var(--site-nav-height)] sm:px-6 md:pb-16">
      <div className="mx-auto w-full max-w-2xl text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND_LOGO_URL} alt="Changer Fusions" className="mx-auto h-14 w-auto" />
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white px-5 py-8 shadow-sm sm:px-8">
          <h1 className="text-xl font-bold text-gray-900">Membership card</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-600">
            Keep this member ID for Kenya Coast Models. Sign in to the member portal with the email on this card.
          </p>
          <div className="mx-auto mt-6 max-w-2xl text-left">
            <KcmMembershipCard card={card} qrValue={qrValue} />
          </div>
        </div>
      </div>
    </main>
  );
}

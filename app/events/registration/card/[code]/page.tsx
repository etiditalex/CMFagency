import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ContestantCardPanel } from "@/components/events/ContestantCardPanel";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { getIdealApplicationFeeKes } from "@/lib/ideal-mr-miss-fee";
import type { ContestantCardData, ContestantCategory, ContestantTitle } from "@/lib/ideal-mr-miss";

export const metadata: Metadata = {
  title: "Application card",
  robots: { index: false, follow: false },
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type Row = {
  application_code: string;
  full_name: string;
  applying_as: ContestantTitle;
  category: ContestantCategory;
  town_county: string;
  created_at: string;
};

export default async function IdealApplicationCardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const applicationCode = decodeURIComponent(code).trim().toUpperCase();
  if (!/^KIM-[A-Z2-9]{8}$/.test(applicationCode)) notFound();
  if (!supabaseUrl || !supabaseServiceKey) notFound();

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabaseAdmin
    .from("ideal_mr_miss_applications")
    .select("application_code, full_name, applying_as, category, town_county, created_at")
    .eq("application_code", applicationCode)
    .maybeSingle();

  if (error || !data) notFound();
  const row = data as Row;
  const card: ContestantCardData = {
    applicationCode: row.application_code,
    fullName: row.full_name,
    applyingAs: row.applying_as,
    category: row.category,
    townCounty: row.town_county,
    issuedOn: row.created_at,
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f3f1ec] px-4 pb-28 pt-[var(--site-nav-height)] sm:px-6 md:pb-16">
      <div className="mx-auto w-full max-w-2xl text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND_LOGO_URL} alt="Changer Fusions" className="mx-auto h-14 w-auto" />
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white px-5 py-8 shadow-sm sm:px-8">
          <ContestantCardPanel card={card} feeKes={await getIdealApplicationFeeKes(supabaseAdmin)} />
        </div>
      </div>
    </main>
  );
}

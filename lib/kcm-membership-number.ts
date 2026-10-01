import type { SupabaseClient } from "@supabase/supabase-js";

function pad3(n: number): string {
  return String(Math.max(0, Math.trunc(n))).padStart(3, "0");
}

export async function allocateKcmMembershipNumber(
  admin: SupabaseClient,
  membershipId: string
): Promise<string | null> {
  const { data: existing, error: eErr } = await admin
    .from("kcm_memberships")
    .select("membership_number")
    .eq("id", membershipId)
    .maybeSingle();
  if (eErr || !existing) return null;

  const already = String((existing as { membership_number?: string | null }).membership_number ?? "").trim();
  if (already) return already;

  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: latestRow } = await admin
      .from("kcm_memberships")
      .select("membership_number")
      .like("membership_number", `KCM/${year}/%`)
      .order("membership_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latest = String((latestRow as { membership_number?: string | null } | null)?.membership_number ?? "").trim();
    const lastNum = latest ? Number.parseInt(latest.split("/").pop() ?? "", 10) : 0;
    const nextNum = (Number.isFinite(lastNum) ? lastNum : 0) + 1 + attempt;
    const membershipNumber = `KCM/${year}/${pad3(nextNum)}`;

    const { data: updated, error: upErr } = await admin
      .from("kcm_memberships")
      .update({
        membership_number: membershipNumber,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", membershipId)
      .is("membership_number", null)
      .select("membership_number")
      .maybeSingle();

    if (!upErr && updated) {
      const saved = String((updated as { membership_number?: string | null }).membership_number ?? "").trim();
      if (saved) return saved;
    }

    if (upErr && String((upErr as { code?: string }).code ?? "") === "42703") return null;
  }

  const { data: after } = await admin
    .from("kcm_memberships")
    .select("membership_number")
    .eq("id", membershipId)
    .maybeSingle();
  return String((after as { membership_number?: string | null } | null)?.membership_number ?? "").trim() || null;
}

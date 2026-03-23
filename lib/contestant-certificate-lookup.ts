import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizePersonName(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export type ContestantCertificateRow = {
  id: string;
  name: string;
  email: string | null;
  certificate_approved_at: string | null;
  certificate_downloaded_at: string | null;
};

/**
 * Public certificate flow: find contestant by exact name (spacing/case-insensitive) in category.
 * If their row has an email, the supplied email must match. If the row has no email (e.g. bulk import),
 * the supplied email is saved so approval/download notifications can be delivered.
 */
export async function resolveContestantForCertificate(
  supabase: SupabaseClient,
  campaignId: string,
  nameInput: string,
  emailInput: string
): Promise<
  | { ok: true; contestant: ContestantCertificateRow }
  | { ok: false; code: "not_found" | "wrong_email" | "ambiguous"; message: string }
> {
  const normName = normalizePersonName(nameInput);
  const normEmail = emailInput.trim().toLowerCase();
  if (!normName || !normEmail) {
    return { ok: false, code: "not_found", message: "Name and email are required." };
  }

  const { data: rows, error } = await supabase
    .from("contestants")
    .select("id,name,email,certificate_approved_at,certificate_downloaded_at")
    .eq("campaign_id", campaignId);

  if (error) {
    return { ok: false, code: "not_found", message: error.message };
  }

  const nameMatches = (rows ?? []).filter((r) => normalizePersonName(String(r.name ?? "")) === normName);
  if (nameMatches.length === 0) {
    return {
      ok: false,
      code: "not_found",
      message: "No registration found for this name and category.",
    };
  }

  let chosen: (typeof nameMatches)[0];
  if (nameMatches.length === 1) {
    chosen = nameMatches[0] as ContestantCertificateRow;
  } else {
    const byEmail = nameMatches.filter(
      (r) => (String(r.email ?? "").trim().toLowerCase()) === normEmail
    );
    if (byEmail.length === 1) {
      chosen = byEmail[0] as ContestantCertificateRow;
    } else {
      return {
        ok: false,
        code: "ambiguous",
        message:
          "Multiple entries match this name. Enter the same email you used when you registered, or contact support.",
      };
    }
  }

  const rowEmail = String(chosen.email ?? "").trim().toLowerCase();
  if (rowEmail) {
    if (rowEmail !== normEmail) {
      return {
        ok: false,
        code: "wrong_email",
        message: "Email does not match our records for this name. Use the email you registered with.",
      };
    }
  } else {
    const { error: upErr } = await supabase
      .from("contestants")
      .update({ email: normEmail })
      .eq("id", chosen.id);
    if (upErr) {
      const msg = String(upErr.message ?? "");
      if (upErr.code === "23505" || msg.toLowerCase().includes("unique")) {
        return {
          ok: false,
          code: "wrong_email",
          message: "This email is already used for another contestant in this category. Use a different email or contact support.",
        };
      }
      return { ok: false, code: "not_found", message: upErr.message };
    }
    chosen = { ...chosen, email: normEmail };
  }

  return { ok: true, contestant: chosen as ContestantCertificateRow };
}

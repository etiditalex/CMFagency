import type { SupabaseClient } from "@supabase/supabase-js";
import { resend, fromEmail } from "./resend";
import { PurchaseReminderEmail } from "@/components/emails/purchase-reminder-email";

export type SendReminderParams = {
  to: string;
  holderName: string;
  itemLabel: string;
  continueUrl: string;
  organizerName?: string;
};

export async function sendPurchaseReminderEmail(
  params: SendReminderParams
): Promise<{ ok: boolean; error?: string }> {
  const { to, holderName, itemLabel, continueUrl, organizerName } = params;
  if (!resend) return { ok: false, error: "RESEND_API_KEY not configured" };

  const subject = "Your payment wasn't completed – would you like to try again?";
  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      react: PurchaseReminderEmail({
        holderName,
        itemLabel,
        continueUrl,
        organizerName,
      }),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

export async function sendPurchaseReminderByRef(
  reference: string,
  supabase: SupabaseClient
): Promise<{ ok: boolean; alreadySent?: boolean; error?: string }> {
  const { data: tx, error: fetchErr } = await supabase
    .from("transactions")
    .select("reference,email,payer_name,status,metadata,campaign_id,campaign_type")
    .eq("reference", reference)
    .maybeSingle();

  if (fetchErr || !tx) return { ok: false, error: "Transaction not found" };

  const t = tx as {
    email?: string | null;
    payer_name?: string | null;
    status?: string;
    metadata?: Record<string, unknown>;
    campaign_id?: string;
    campaign_type?: string;
  };
  const status = String(t.status ?? "");
  if (status !== "pending" && status !== "failed") {
    return { ok: false, error: "Transaction is not pending or failed" };
  }

  const email = (t.email ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "No email on transaction" };

  const meta = (t.metadata && typeof t.metadata === "object" ? t.metadata : {}) as Record<string, unknown>;
  if (meta.reminder_sent_at) {
    return { ok: true, alreadySent: true };
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
  let continueUrl: string;
  let itemLabel: string;
  const slug = String(meta.slug ?? meta.campaign_slug ?? "").trim();
  const isMerchandise = slug.toLowerCase() === "merchandise" || meta.merchandise_cart === true;

  if (isMerchandise) {
    continueUrl = `${baseUrl}/merchandise`;
    itemLabel = "merchandise";
  } else if (slug) {
    continueUrl = `${baseUrl}/${slug}`;
    const campaignTitle = String(meta.campaign_title ?? slug);
    itemLabel = t.campaign_type === "vote" ? `votes for ${campaignTitle}` : `tickets for ${campaignTitle}`;
  } else {
    continueUrl = baseUrl;
    itemLabel = t.campaign_type === "vote" ? "votes" : "tickets";
  }

  const holderName = (t.payer_name ?? "").trim() || email;

  const result = await sendPurchaseReminderEmail({
    to: email,
    holderName,
    itemLabel,
    continueUrl,
  });

  if (!result.ok) return result;

  await supabase
    .from("transactions")
    .update({ metadata: { ...meta, reminder_sent_at: new Date().toISOString() } } as any)
    .eq("reference", reference);

  return { ok: true };
}

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Marks a service invoice as paid and links the successful transaction (idempotent).
 */
export async function markServiceInvoicePaid(
  supabase: SupabaseClient,
  invoiceId: string,
  transactionId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: row, error: fetchErr } = await supabase
    .from("service_invoices")
    .select("id,status")
    .eq("id", invoiceId)
    .maybeSingle();

  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!row) return { ok: false, error: "invoice_not_found" };

  if ((row as { status?: string }).status === "paid") {
    return { ok: true };
  }

  const { error: updErr } = await supabase
    .from("service_invoices")
    .update({
      status: "paid",
      transaction_id: transactionId,
      paid_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("id", invoiceId)
    .eq("status", "unpaid");

  if (updErr) return { ok: false, error: updErr.message };
  return { ok: true };
}

import { resend, fromEmail } from "./resend";
import { ReceiptEmail } from "@/components/emails/receipt-email";

export type ReceiptParams = {
  to: string;
  campaignTitle: string;
  typeLabel: "Ticket" | "Vote" | "Order";
  ticketNumber: string;
  holderName: string;
  amount: string;
  quantity: string;
  reference: string;
  mpesaReceipt?: string;
  variant?: "mpesa" | "paystack";
};

export async function sendReceiptEmail(params: ReceiptParams): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const {
    to,
    campaignTitle,
    typeLabel,
    ticketNumber,
    holderName,
    amount,
    quantity,
    reference,
    mpesaReceipt,
    variant = "paystack",
  } = params;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Your ${typeLabel.toLowerCase()} receipt – ${campaignTitle}`,
      react: ReceiptEmail({
        campaignTitle,
        typeLabel,
        ticketNumber,
        holderName,
        amount,
        quantity,
        reference,
        paymentLabel: variant === "mpesa" ? "M-Pesa payment confirmed" : "Payment confirmed",
        mpesaReceipt,
        variant,
      }),
    });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

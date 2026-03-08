import React from "react";
import { render } from "@react-email/render";
import { resend, fromEmail } from "./resend";
import { isSmtpConfigured, sendEmailViaSmtp } from "./email-smtp";
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

const receiptProps = (
  params: ReceiptParams
): React.ComponentProps<typeof ReceiptEmail> => ({
  campaignTitle: params.campaignTitle,
  typeLabel: params.typeLabel,
  ticketNumber: params.ticketNumber,
  holderName: params.holderName,
  amount: params.amount,
  quantity: params.quantity,
  reference: params.reference,
  paymentLabel: params.variant === "mpesa" ? "M-Pesa payment confirmed" : "Payment confirmed",
  mpesaReceipt: params.mpesaReceipt,
  variant: params.variant ?? "paystack",
});

export async function sendReceiptEmail(params: ReceiptParams): Promise<{ ok: boolean; error?: string }> {
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

  const subject = `Your ${typeLabel.toLowerCase()} receipt – ${campaignTitle}`;
  const from = fromEmail;

  // Prefer Resend SMTP when configured (Resend dashboard → SMTP)
  if (isSmtpConfigured()) {
    try {
      const html = await render(
        React.createElement(ReceiptEmail, receiptProps(params))
      );
      return sendEmailViaSmtp({ to, subject, html, from });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return { ok: false, error: msg };
    }
  }

  // Resend API (default)
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      react: ReceiptEmail(receiptProps(params)),
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

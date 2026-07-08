import React from "react";
import { render } from "@react-email/render";
import { resend, fromEmail } from "./resend";
import { isSmtpConfigured, sendEmailViaSmtp } from "./email-smtp";
import { DEFAULT_LOGO_URL, CHANGER_LOGO_CID } from "./admin-email-template";
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
  /** Vote receipts: nominee name */
  votedForName?: string;
  variant?: "mpesa" | "paystack";
  viewTicketsUrl?: string;
  downloadReceiptUrl?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  organizerName?: string;
  organizerEmail?: string;
  rsvpUrl?: string;
  campaignSlug?: string;
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
  votedForName: params.votedForName,
  variant: params.variant ?? "paystack",
  viewTicketsUrl: params.viewTicketsUrl,
  downloadReceiptUrl: params.downloadReceiptUrl,
  eventDate: params.eventDate,
  eventTime: params.eventTime,
  eventLocation: params.eventLocation,
  organizerName: params.organizerName,
  organizerEmail: params.organizerEmail,
  rsvpUrl: params.rsvpUrl,
  campaignSlug: params.campaignSlug,
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

  const subject =
    typeLabel === "Ticket"
      ? `Your invitation & ticket – ${campaignTitle}`
      : `Your ${typeLabel.toLowerCase()} receipt – ${campaignTitle}`;
  const from = fromEmail;

  const logoAttachmentResend = { path: DEFAULT_LOGO_URL, filename: "changer-logo.png", contentId: CHANGER_LOGO_CID };

  // Prefer Resend SMTP when configured (Resend dashboard → SMTP)
  if (isSmtpConfigured()) {
    try {
      const html = await render(
        React.createElement(ReceiptEmail, receiptProps(params))
      );
      const logoBuf = await fetch(DEFAULT_LOGO_URL).then((r) => r.arrayBuffer()).then((ab) => Buffer.from(ab));
      const smtpLogoAttachment = { filename: "changer-logo.png", content: logoBuf, cid: CHANGER_LOGO_CID };
      return sendEmailViaSmtp({ to, subject, html, from, attachments: [smtpLogoAttachment] });
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
      attachments: [logoAttachmentResend],
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

import React from "react";
import { render } from "@react-email/render";
import { resend, fromEmail } from "./resend";
import { isSmtpConfigured, sendEmailViaSmtp, type SmtpAttachment } from "./email-smtp";
import { DEFAULT_LOGO_URL, CHANGER_LOGO_CID } from "./admin-email-template";
import { ReceiptEmail } from "@/components/emails/receipt-email";
import { TicketConfirmationEmail } from "@/components/emails/ticket-confirmation-email";
import type { EventTicketPdfInput } from "@/lib/event-ticket";
import { ticketPdfFilename } from "@/lib/event-ticket";
import { buildEventTicketPdf } from "@/lib/event-ticket-pdf";

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
  downloadTicketUrl?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  organizerName?: string;
  organizerEmail?: string;
  rsvpUrl?: string;
  campaignSlug?: string;
  ticketPdf?: EventTicketPdfInput;
};

let cachedLogo: { buf: Buffer; at: number } | null = null;
const LOGO_TTL_MS = 60 * 60 * 1000;

async function getCachedLogoBuffer(): Promise<Buffer | null> {
  if (cachedLogo && Date.now() - cachedLogo.at < LOGO_TTL_MS) return cachedLogo.buf;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(DEFAULT_LOGO_URL, { signal: ctrl.signal });
    if (!res.ok) return cachedLogo?.buf ?? null;
    const buf = Buffer.from(await res.arrayBuffer());
    cachedLogo = { buf, at: Date.now() };
    return buf;
  } catch {
    return cachedLogo?.buf ?? null;
  } finally {
    clearTimeout(timer);
  }
}

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

async function buildTicketPdfBuffer(
  ticket: EventTicketPdfInput | undefined
): Promise<{ filename: string; content: Buffer } | null> {
  if (!ticket) return null;
  try {
    const bytes = await buildEventTicketPdf(ticket);
    return { filename: ticketPdfFilename(ticket.ticketId), content: Buffer.from(bytes) };
  } catch (e) {
    console.warn("[ticket-email] PDF build failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function sendReceiptEmail(params: ReceiptParams): Promise<{ ok: boolean; error?: string }> {
  const { to, campaignTitle, typeLabel } = params;
  const isTicket = typeLabel === "Ticket";
  const eventTitle = params.ticketPdf?.eventTitle || campaignTitle;
  const subject = isTicket
    ? `Your ticket – ${eventTitle}`
    : `Your ${typeLabel.toLowerCase()} receipt – ${campaignTitle}`;
  const from = fromEmail;

  const ticketPdf = isTicket ? await buildTicketPdfBuffer(params.ticketPdf) : null;
  const logoAttachmentResend = { path: DEFAULT_LOGO_URL, filename: "changer-logo.png", contentId: CHANGER_LOGO_CID };

  const ticketEmailEl = React.createElement(TicketConfirmationEmail, {
    holderName: params.holderName,
    ticketTypeLabel: params.ticketPdf?.ticketTypeLabel || campaignTitle,
    ticketDay: params.ticketPdf?.ticketDay || params.eventDate || "",
    organizerName: params.ticketPdf?.organizerName || params.organizerName || "Changer Fusions",
    downloadTicketUrl: params.downloadTicketUrl,
  });

  if (isSmtpConfigured()) {
    try {
      const html = await render(isTicket ? ticketEmailEl : React.createElement(ReceiptEmail, receiptProps(params)));
      const logoBuf = await getCachedLogoBuffer();
      const attachments: SmtpAttachment[] = [];
      if (logoBuf) attachments.push({ filename: "changer-logo.png", content: logoBuf, cid: CHANGER_LOGO_CID });
      if (ticketPdf) attachments.push({ filename: ticketPdf.filename, content: ticketPdf.content });
      return sendEmailViaSmtp({
        to,
        subject,
        html,
        from,
        attachments: attachments.length ? attachments : undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return { ok: false, error: msg };
    }
  }

  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const attachments: Array<{
      filename: string;
      path?: string;
      content?: Buffer;
      contentId?: string;
    }> = [logoAttachmentResend];
    if (ticketPdf) {
      attachments.push({ filename: ticketPdf.filename, content: ticketPdf.content });
    }

    const { error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      react: isTicket ? ticketEmailEl : ReceiptEmail(receiptProps(params)),
      attachments,
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

import React from "react";
import { render } from "@react-email/render";
import { resend, fromEmail } from "./resend";
import { isSmtpConfigured, sendEmailViaSmtp } from "./email-smtp";
import { EventInviteEmail } from "@/components/emails/event-invite-email";

export type EventInviteParams = {
  to: string;
  eventTitle: string;
  holderName: string;
  reference: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  organizerName?: string;
  organizerEmail?: string;
  calendarUrl?: string;
  mapUrl?: string;
  designation?: string;
};

export async function sendEventInviteEmail(params: EventInviteParams): Promise<{ ok: boolean; error?: string }> {
  const { to, eventTitle } = params;
  const subject = `Your invitation – ${eventTitle}`;
  const from = fromEmail;

  const props = {
    eventTitle: params.eventTitle,
    holderName: params.holderName,
    reference: params.reference,
    eventDate: params.eventDate,
    eventTime: params.eventTime,
    eventLocation: params.eventLocation,
    organizerName: params.organizerName,
    organizerEmail: params.organizerEmail,
    calendarUrl: params.calendarUrl,
    mapUrl: params.mapUrl,
    designation: params.designation,
  };

  if (isSmtpConfigured()) {
    try {
      const html = await render(React.createElement(EventInviteEmail, props));
      return sendEmailViaSmtp({ to, subject, html, from });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return { ok: false, error: msg };
    }
  }

  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      react: React.createElement(EventInviteEmail, props),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

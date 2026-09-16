import { Body, Container, Head, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import * as React from "react";

export type TicketConfirmationEmailProps = {
  holderName: string;
  ticketTypeLabel: string;
  ticketDay: string;
  organizerName?: string;
  downloadTicketUrl?: string;
};

export function TicketConfirmationEmail({
  holderName,
  ticketTypeLabel,
  ticketDay,
  organizerName = "Changer Fusions",
  downloadTicketUrl,
}: TicketConfirmationEmailProps) {
  const dateBit = ticketDay ? `, for the date ${ticketDay}` : "";
  const previewText = `Attached is your ${ticketTypeLabel}${dateBit}.`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src="cid:changer-logo"
              alt="Changer Fusions"
              width={140}
              height={48}
              style={logo}
            />
          </Section>
          <Section style={content}>
            <Text style={hello}>Hi {holderName},</Text>
            <Text style={bodyText}>
              Attached is your {ticketTypeLabel}
              {dateBit}. Looking forward to seeing you in many more events and have you attend more.
            </Text>
            <Text style={bodyText}>Make sure to have fun and network during this event!</Text>
            <Text style={bodyText}>Thank you!</Text>
            <Text style={signOff}>{organizerName}</Text>
            {downloadTicketUrl && (
              <Text style={downloadNote}>
                You can also{" "}
                <Link href={downloadTicketUrl} style={downloadLink}>
                  download your ticket PDF
                </Link>
                .
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f3f4f6",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  padding: "24px 12px",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "560px",
  borderRadius: "16px",
  overflow: "hidden" as const,
  border: "1px solid #e5e7eb",
};

const logoSection = {
  padding: "32px 32px 8px",
  textAlign: "center" as const,
};

const logo = {
  height: 56,
  width: "auto",
  maxWidth: 180,
  display: "block",
  margin: "0 auto",
};

const content = {
  padding: "16px 40px 40px",
};

const hello = {
  margin: "0 0 16px",
  fontSize: "22px",
  lineHeight: "1.4",
  fontWeight: 600,
  color: "#111827",
};

const bodyText = {
  margin: "0 0 14px",
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#374151",
};

const signOff = {
  margin: "8px 0 0",
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#111827",
  fontWeight: 600,
};

const downloadNote = {
  margin: "28px 0 0",
  fontSize: "13px",
  lineHeight: "1.5",
  color: "#6b7280",
};

const downloadLink = {
  color: "#B8860B",
  textDecoration: "underline",
};

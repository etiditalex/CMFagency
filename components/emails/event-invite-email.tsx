import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export type EventInviteEmailProps = {
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
};

function qrCodeUrl(data: string, size = 150): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export function EventInviteEmail({
  eventTitle,
  holderName,
  reference,
  eventDate,
  eventTime,
  eventLocation,
  organizerName = "CMF Agency",
  organizerEmail = "info@cmfagency.co.ke",
  calendarUrl,
  mapUrl,
}: EventInviteEmailProps) {
  const ticketId = `REG-${reference.replace(/^reg_/, "").replace(/-/g, "").slice(-10).toUpperCase()}`;
  const qrData = `${ticketId}\n${reference}`;

  return (
    <Html>
      <Head />
      <Preview>Your invitation – {eventTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...header, background: "linear-gradient(135deg, #059669 0%, #047857 100%)" }}>
            <Heading style={headerTitle}>{eventTitle}</Heading>
            <Text style={headerSubtitle}>You&apos;re invited</Text>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={sectionTitle}>
              Your invitation
            </Heading>
            <Text style={holderNameText}>{holderName}</Text>

            <table style={buttonTable}>
              <tbody>
                <tr>
                  <td style={qrCell}>
                    <Img
                      src={qrCodeUrl(qrData)}
                      width={120}
                      height={120}
                      alt="Invitation QR code"
                      style={qrImage}
                    />
                    <Text style={qrLabel}>Show at entry</Text>
                  </td>
                </tr>
              </tbody>
            </table>

            <Text style={greeting}>
              Hello {holderName}, you are registered for {eventTitle}. Please keep this email and show the QR code at the entrance.
            </Text>

            {eventLocation && (
              <Text style={locationHighlight}>
                The event will take place at {eventLocation}.
              </Text>
            )}

            <Text style={referenceText}>
              Ticket ID: <code style={code}>{ticketId}</code>
            </Text>

            {(eventDate || eventTime || eventLocation || calendarUrl || mapUrl) && (
              <>
                <Hr style={hr} />
                <Text style={eventSectionTitle}>Event details</Text>
                {eventDate && (
                  <Text style={eventDetail}>📅 {eventDate}{eventTime ? ` · ${eventTime}` : ""}</Text>
                )}
                {eventLocation && <Text style={eventDetail}>📍 {eventLocation}</Text>}
                {(calendarUrl || mapUrl) && (
                  <div style={ctaRow}>
                    {calendarUrl && (
                      <Link href={calendarUrl} style={primaryButton}>
                        Add to calendar
                      </Link>
                    )}
                    {mapUrl && (
                      <Link href={mapUrl} style={secondaryButton}>
                        Open in Maps
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}

            <Hr style={hr} />
            <Text style={organizerLabel}>Questions about this event?</Text>
            <Text style={organizerText}>
              Contact: {organizerName}
              {organizerEmail && (
                <> · <Link href={`mailto:${organizerEmail}`} style={organizerLink}>{organizerEmail}</Link></>
              )}
            </Text>
          </Section>

          <Text style={footer}>Sent by {organizerName}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "0",
  marginBottom: "64px",
  maxWidth: "560px",
  borderRadius: "12px",
  overflow: "hidden" as const,
  border: "1px solid #e9ecef",
};

const header = {
  padding: "24px",
  textAlign: "center" as const,
};

const headerTitle = {
  color: "#ffffff",
  margin: "0",
  fontSize: "1.4rem",
  fontWeight: "600",
};

const headerSubtitle = {
  color: "rgba(255,255,255,0.9)",
  margin: "8px 0 0",
  fontSize: "14px",
};

const content = {
  padding: "24px",
  backgroundColor: "#fafafa",
};

const sectionTitle = {
  margin: "0 0 4px",
  fontSize: "18px",
  fontWeight: "600",
  color: "#333",
};

const holderNameText = {
  margin: "0 0 16px",
  fontSize: "20px",
  fontWeight: "600",
  color: "#111",
};

const buttonTable = { width: "100%", marginBottom: "20px", borderCollapse: "collapse" as const };
const qrCell = { width: "140px", verticalAlign: "top" as const, paddingRight: "16px" };
const qrImage = { display: "block", borderRadius: "8px" };
const qrLabel = { margin: "4px 0 0", fontSize: "11px", color: "#666" };

const greeting = {
  margin: "0 0 20px",
  fontSize: "15px",
  lineHeight: "1.5",
  color: "#444",
};

const locationHighlight = {
  margin: "0 0 20px",
  padding: "12px 16px",
  backgroundColor: "#ecfdf5",
  borderLeft: "4px solid #059669",
  fontSize: "15px",
  lineHeight: "1.5",
  color: "#333",
  borderRadius: "0 8px 8px 0",
};

const referenceText = { marginTop: "20px", fontSize: "12px", color: "#666" };
const code = { backgroundColor: "#e9ecef", padding: "2px 6px", borderRadius: "4px", fontFamily: "monospace" };
const hr = { borderColor: "#e9ecef", margin: "20px 0" };
const eventSectionTitle = { margin: "0 0 8px", fontSize: "14px", fontWeight: "600", color: "#333" };
const eventDetail = { margin: "0 0 4px", fontSize: "14px", color: "#555" };
const ctaRow = {
  marginTop: "12px",
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
};
const primaryButton = {
  display: "inline-block",
  padding: "8px 14px",
  borderRadius: "999px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 600,
  textDecoration: "none",
};
const secondaryButton = {
  display: "inline-block",
  padding: "8px 14px",
  borderRadius: "999px",
  backgroundColor: "#e5e7eb",
  color: "#111827",
  fontSize: "13px",
  fontWeight: 500,
  textDecoration: "none",
};
const organizerLabel = { margin: "0 0 4px", fontSize: "13px", fontWeight: "600", color: "#333" };
const organizerText = { margin: "0", fontSize: "13px", color: "#555" };
const organizerLink = { color: "#059669", textDecoration: "none" };
const footer = { color: "#888", fontSize: "11px", margin: "0 24px 24px" };

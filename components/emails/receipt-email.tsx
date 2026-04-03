import {
  Body,
  Button,
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

export type ReceiptEmailProps = {
  campaignTitle: string;
  typeLabel: "Ticket" | "Vote" | "Order";
  ticketNumber: string;
  holderName: string;
  amount: string;
  quantity: string;
  reference: string;
  paymentLabel?: string;
  mpesaReceipt?: string;
  /** Vote receipts: who the voter supported */
  votedForName?: string;
  /** "mpesa" = green gradient, "paystack" = purple gradient */
  variant?: "mpesa" | "paystack";
  /** Link to view ticket / event page (e.g. success page or event URL) */
  viewTicketsUrl?: string;
  /** Link to download/print receipt (opens print-friendly page) */
  downloadReceiptUrl?: string;
  /** Optional event details for ticket-type receipts */
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  /** Organizer contact for "Questions? Contact..." */
  organizerName?: string;
  organizerEmail?: string;
  /** Optional RSVP link so guests can confirm their details */
  rsvpUrl?: string;
};

const headerStyles = {
  mpesa: { background: "linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)" },
  paystack: { background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
};

const buttonStyles = {
  mpesa: { background: "linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)" },
  paystack: { background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
};

function qrCodeUrl(data: string, size = 150): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export function ReceiptEmail({
  campaignTitle,
  typeLabel,
  ticketNumber,
  holderName,
  amount,
  quantity,
  reference,
  paymentLabel = "Payment confirmed",
  mpesaReceipt,
  votedForName,
  variant = "paystack",
  viewTicketsUrl,
  downloadReceiptUrl,
  eventDate,
  eventTime,
  eventLocation,
  organizerName = "CMF Agency",
  organizerEmail = "info@cmfagency.co.ke",
  rsvpUrl,
}: ReceiptEmailProps) {
  const holderLabel = typeLabel === "Order" ? "Customer" : `${typeLabel} holder`;
  const isTicket = typeLabel === "Ticket";
  const isVote = typeLabel === "Vote";
  const qrData = `${ticketNumber}\n${reference}`;
  const viewButtonText = typeLabel === "Vote" ? "View Vote" : typeLabel === "Ticket" ? "View Ticket" : "View Order";
  const previewText =
    isTicket && (eventDate || eventLocation)
      ? `Your invitation & ticket – ${campaignTitle}`
      : `Your ${typeLabel.toLowerCase()} receipt – ${campaignTitle}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...header, ...headerStyles[variant] }}>
            <Img
              src="cid:changer-logo"
              alt="Changer Fusions"
              width={140}
              height={48}
              style={{ height: 48, width: "auto", maxWidth: 180, display: "block", marginBottom: 12 }}
            />
            <Heading style={headerTitle}>{campaignTitle}</Heading>
            <Text style={headerSubtitle}>{paymentLabel}</Text>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={sectionTitle}>
              {isTicket ? "Your invitation & ticket" : `Your ${typeLabel.toLowerCase()}`}
            </Heading>
            <Text style={holderNameText}>{holderName}</Text>
            {isVote && votedForName && (
              <Text style={voteSupportLine}>
                <strong>{holderName}</strong> voted for <strong>{votedForName}</strong>.
              </Text>
            )}

            {(viewTicketsUrl || isTicket) && (
              <table style={buttonTable}>
                <tbody>
                  <tr>
                    <td style={qrCell}>
                      <Img
                        src={qrCodeUrl(qrData)}
                        width={120}
                        height={120}
                        alt="Ticket QR code"
                        style={qrImage}
                      />
                      <Text style={qrLabel}>Show at entry</Text>
                    </td>
                    <td style={buttonCell}>
                      {viewTicketsUrl && (
                        <Button href={viewTicketsUrl} style={{ ...viewTicketsButton, ...buttonStyles[variant] }}>
                          {viewButtonText}
                        </Button>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            <Text style={greeting}>
              Hello {holderName},{" "}
              {isTicket
                ? `your invitation and ticket for ${campaignTitle} is confirmed. Please keep this email safe and show the QR code at the entrance.`
                : isVote && votedForName
                  ? `thank you for voting for ${votedForName} in ${campaignTitle}.`
                  : `we are happy to confirm your ${typeLabel.toLowerCase()} for ${campaignTitle}.`}
            </Text>

            {eventLocation && (
              <Text style={locationHighlight}>
                {campaignTitle} will be happening at {eventLocation}.
              </Text>
            )}

            <table style={table}>
              <tr>
                <td style={labelCell}>{typeLabel} number:</td>
                <td style={valueCell}>{ticketNumber}</td>
              </tr>
              <tr>
                <td style={labelCell}>{holderLabel}:</td>
                <td style={valueCell}>{holderName}</td>
              </tr>
              {isVote && votedForName && (
                <tr>
                  <td style={labelCell}>Voted for:</td>
                  <td style={valueCell}>{votedForName}</td>
                </tr>
              )}
              <tr>
                <td style={labelCell}>Amount paid:</td>
                <td style={valueCell}>{amount}</td>
              </tr>
              {mpesaReceipt && (
                <tr>
                  <td style={labelCell}>M-Pesa receipt:</td>
                  <td style={valueCell}>{mpesaReceipt}</td>
                </tr>
              )}
              <tr>
                <td style={labelCell}>Quantity:</td>
                <td style={valueCell}>{quantity}</td>
              </tr>
            </table>
            <Text style={referenceText}>
              Reference: <code style={code}>{reference}</code>
            </Text>

            {isTicket && rsvpUrl && (
              <Section style={downloadSection}>
                <Button href={rsvpUrl} style={{ ...downloadButton, ...buttonStyles[variant] }}>
                  Confirm your details / RSVP
                </Button>
                <Text style={downloadHint}>
                  Use this link to share your preferred contact details with the organisers for this event.
                </Text>
              </Section>
            )}

            {downloadReceiptUrl && (
              <Section style={downloadSection}>
                <Button href={downloadReceiptUrl} style={{ ...downloadButton, ...buttonStyles[variant] }}>
                  Download receipt
                </Button>
                <Text style={downloadHint}>Opens a print-friendly page — use your browser&apos;s Print or Save as PDF to save.</Text>
              </Section>
            )}

            {(eventDate || eventTime || eventLocation) && (
              <>
                <Hr style={hr} />
                <Text style={eventSectionTitle}>Event details</Text>
                {eventDate && (
                  <Text style={eventDetail}>📅 {eventDate}{eventTime ? ` · ${eventTime}` : ""}</Text>
                )}
                {eventLocation && (
                  <Text style={eventDetail}>📍 {eventLocation}</Text>
                )}
              </>
            )}

            <Hr style={hr} />
            <Text style={organizerLabel}>Questions about this event?</Text>
            <Text style={organizerText}>
              Please contact the organizer: {organizerName}
              {organizerEmail && (
                <> · <Link href={`mailto:${organizerEmail}`} style={organizerLink}>{organizerEmail}</Link></>
              )}
            </Text>
          </Section>

          <Text style={footer}>Sent by {organizerName} · Changer Fusions</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
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
  margin: "0 0 8px",
  fontSize: "20px",
  fontWeight: "600",
  color: "#111",
};

const voteSupportLine = {
  margin: "0 0 16px",
  fontSize: "15px",
  lineHeight: "1.5",
  color: "#444",
};

const buttonTable = {
  width: "100%",
  marginBottom: "20px",
  borderCollapse: "collapse" as const,
};

const qrCell = {
  width: "140px",
  verticalAlign: "top" as const,
  paddingRight: "16px",
};

const qrImage = {
  display: "block",
  borderRadius: "8px",
};

const qrLabel = {
  margin: "4px 0 0",
  fontSize: "11px",
  color: "#666",
};

const buttonCell = {
  verticalAlign: "top" as const,
};

const viewTicketsButton = {
  color: "#fff",
  padding: "12px 24px",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "14px",
  textDecoration: "none",
};

const greeting = {
  margin: "0 0 20px",
  fontSize: "15px",
  lineHeight: "1.5",
  color: "#444",
};

const locationHighlight = {
  margin: "0 0 20px",
  padding: "12px 16px",
  backgroundColor: "#fef9e7",
  borderLeft: "4px solid #D4AF37",
  fontSize: "15px",
  lineHeight: "1.5",
  color: "#333",
  borderRadius: "0 8px 8px 0",
};

const downloadSection = {
  margin: "24px 0",
};

const downloadButton = {
  color: "#fff",
  padding: "12px 24px",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "14px",
  textDecoration: "none",
};

const downloadHint = {
  margin: "8px 0 0",
  fontSize: "12px",
  color: "#666",
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const labelCell = {
  padding: "8px 0",
  color: "#666",
  fontSize: "14px",
};

const valueCell = {
  padding: "8px 0",
  fontWeight: "bold",
  fontFamily: "monospace",
  fontSize: "14px",
};

const referenceText = {
  marginTop: "20px",
  fontSize: "12px",
  color: "#666",
};

const code = {
  backgroundColor: "#e9ecef",
  padding: "2px 6px",
  borderRadius: "4px",
  fontFamily: "monospace",
};

const hr = {
  borderColor: "#e9ecef",
  margin: "20px 0",
};

const eventSectionTitle = {
  margin: "0 0 8px",
  fontSize: "14px",
  fontWeight: "600",
  color: "#333",
};

const eventDetail = {
  margin: "0 0 4px",
  fontSize: "14px",
  color: "#555",
};

const organizerLabel = {
  margin: "0 0 4px",
  fontSize: "13px",
  fontWeight: "600",
  color: "#333",
};

const organizerText = {
  margin: "0",
  fontSize: "13px",
  color: "#555",
};

const organizerLink = {
  color: "#667eea",
  textDecoration: "none",
};

const footer = {
  color: "#888",
  fontSize: "11px",
  margin: "0 24px 24px",
};

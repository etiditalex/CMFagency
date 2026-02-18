import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
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
  /** "mpesa" = green gradient, "paystack" = purple gradient */
  variant?: "mpesa" | "paystack";
};

const headerStyles = {
  mpesa: { background: "linear-gradient(135deg, #00A651 0%, #007A3D 100%)" },
  paystack: { background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
};

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
  variant = "paystack",
}: ReceiptEmailProps) {
  const holderLabel = typeLabel === "Order" ? "Customer" : `${typeLabel} holder`;
  return (
    <Html>
      <Head />
      <Preview>Your {typeLabel.toLowerCase()} receipt – {campaignTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...header, ...headerStyles[variant] }}>
            <Heading style={headerTitle}>{campaignTitle}</Heading>
            <Text style={headerSubtitle}>{paymentLabel}</Text>
          </Section>
          <Section style={content}>
            <table style={table}>
              <tr>
                <td style={labelCell}>{typeLabel} number:</td>
                <td style={valueCell}>{ticketNumber}</td>
              </tr>
              <tr>
                <td style={labelCell}>{holderLabel}:</td>
                <td style={valueCell}>{holderName}</td>
              </tr>
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
          </Section>
          <Hr style={hr} />
          <Text style={footer}>Sent by CMF Agency · Changer Fusions</Text>
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
  backgroundColor: "#f8f9fa",
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
  margin: "20px 24px",
};

const footer = {
  color: "#888",
  fontSize: "11px",
  margin: "0 24px 24px",
};

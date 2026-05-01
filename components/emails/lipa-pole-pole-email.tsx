import {
  Body,
  Button,
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

export type LipaPolePoleEmailProps = {
  holderName: string;
  campaignTitle: string;
  totalDueKes: number;
  paidKes: number;
  balanceKes: number;
  continueUrl: string;
  variant: "reminder" | "partial_paid";
};

export function LipaPolePoleEmail({
  holderName,
  campaignTitle,
  totalDueKes,
  paidKes,
  balanceKes,
  continueUrl,
  variant,
}: LipaPolePoleEmailProps) {
  const isReminder = variant === "reminder";
  return (
    <Html>
      <Head />
      <Preview>
        {isReminder
          ? `Lipa Pole Pole — KES ${balanceKes.toLocaleString()} remaining for ${campaignTitle}`
          : `Lipa Pole Pole — we received KES ${paidKes.toLocaleString()} toward ${campaignTitle}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>Lipa Pole Pole</Heading>
            <Text style={headerSubtitle}>Installment tickets · {campaignTitle}</Text>
          </Section>
          <Section style={content}>
            <Text style={greeting}>Hello {holderName},</Text>
            {isReminder ? (
              <Text style={paragraph}>
                You still have <strong>KES {balanceKes.toLocaleString()}</strong> left to pay on your Lipa Pole Pole
                plan (total ticket price KES {totalDueKes.toLocaleString()}, paid so far KES{" "}
                {paidKes.toLocaleString()}).
              </Text>
            ) : (
              <Text style={paragraph}>
                Thank you — we recorded <strong>KES {paidKes.toLocaleString()}</strong> toward your tickets.{" "}
                {balanceKes > 0 ? (
                  <>
                    Outstanding balance: <strong>KES {balanceKes.toLocaleString()}</strong>.
                  </>
                ) : (
                  <>Your plan is fully paid — your tickets are confirmed.</>
                )}
              </Text>
            )}
            {balanceKes > 0 ? (
              <>
                <Text style={paragraph}>
                  Use the same CFM Tickets page to pay the next installment (enter your email and phone, check
                  balance, then pay with M-Pesa or card).
                </Text>
                <Section style={buttonWrap}>
                  <Button href={continueUrl} style={button}>
                    Complete payment
                  </Button>
                </Section>
              </>
            ) : null}
            <Text style={small}>
              Lipa Pole Pole helps you secure tickets with flexible payments. Questions? Reply to this email or
              contact CMF Agency.
            </Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>CMF Agency · Changer Fusions</Text>
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
  background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
};

const headerTitle = { color: "#ffffff", fontSize: "22px", margin: "0 0 8px 0" };
const headerSubtitle = { color: "rgba(255,255,255,0.95)", fontSize: "14px", margin: "0" };

const content = { padding: "24px" };
const greeting = { fontSize: "16px", lineHeight: "24px", color: "#1a1a1a" };
const paragraph = { fontSize: "15px", lineHeight: "24px", color: "#374151" };
const buttonWrap = { textAlign: "center" as const, margin: "24px 0" };
const button = {
  backgroundColor: "#0f766e",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "15px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};
const small = { fontSize: "12px", color: "#6b7280", lineHeight: "18px" };
const hr = { borderColor: "#e5e7eb", margin: "0" };
const footer = { fontSize: "12px", color: "#9ca3af", textAlign: "center" as const, padding: "16px" };

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

export type PurchaseReminderEmailProps = {
  holderName: string;
  itemLabel: string;
  continueUrl: string;
  organizerName?: string;
};

export function PurchaseReminderEmail({
  holderName,
  itemLabel,
  continueUrl,
  organizerName = "CMF Agency",
}: PurchaseReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your payment wasn&apos;t completed – would you like to try again?</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>Payment not completed</Heading>
            <Text style={headerSubtitle}>We&apos;re here if you&apos;d like to try again</Text>
          </Section>
          <Section style={content}>
            <Text style={greeting}>Hello {holderName},</Text>
            <Text style={paragraph}>
              You started a purchase for {itemLabel} but the payment didn&apos;t go through. This can happen if the payment was cancelled, timed out, or something went wrong.
            </Text>
            <Text style={paragraph}>If you&apos;d like to continue, you can complete your purchase using the link below:</Text>
            <Section style={buttonWrap}>
              <Button href={continueUrl} style={button}>
                Continue your purchase
              </Button>
            </Section>
            <Text style={small}>If you didn&apos;t try to buy anything, you can ignore this email.</Text>
          </Section>
          <Hr style={hr} />
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
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
};

const headerTitle = {
  color: "#ffffff",
  margin: "0",
  fontSize: "1.25rem",
  fontWeight: "600",
};

const headerSubtitle = {
  color: "rgba(255,255,255,0.9)",
  margin: "8px 0 0",
  fontSize: "14px",
};

const content = {
  padding: "24px",
};

const greeting = {
  margin: "0 0 16px",
  fontSize: "16px",
  color: "#333",
};

const paragraph = {
  margin: "0 0 16px",
  fontSize: "15px",
  lineHeight: "1.5",
  color: "#444",
};

const buttonWrap = {
  margin: "24px 0",
};

const button = {
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "#fff",
  padding: "14px 28px",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "15px",
  textDecoration: "none",
};

const small = {
  margin: "16px 0 0",
  fontSize: "13px",
  color: "#666",
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

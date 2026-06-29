/**
 * Sends WhatsApp text messages via Meta WhatsApp Cloud API when configured.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */

function normalizeWhatsAppPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  return digits;
}

function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_CLOUD_API_TOKEN?.trim() && process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  );
}

export async function sendAttendanceRegisterWhatsApp(params: {
  to: string;
  businessName: string;
  employeeName: string;
  eventType: "sign_in" | "sign_out";
  occurredAtLabel: string;
  dayKey: string;
  downloadUrl?: string | null;
}): Promise<boolean> {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) return false;

  const to = normalizeWhatsAppPhone(params.to);
  if (!to) return false;

  const action = params.eventType === "sign_in" ? "signed in" : "signed out";
  const lines = [
    `*Fusion Xpress · Attendance register*`,
    ``,
    `*${params.employeeName}* has ${action} at *${params.businessName}*.`,
    `Time: ${params.occurredAtLabel}`,
    `Register date: ${params.dayKey}`,
  ];
  if (params.downloadUrl) {
    lines.push(``, `Download today's attendance register:`, params.downloadUrl);
  }
  const body = lines.join("\n");

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: Boolean(params.downloadUrl), body },
      }),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      console.warn(
        "[sendAttendanceRegisterWhatsApp]",
        errBody.error?.message ?? res.status
      );
      return false;
    }
    return true;
  } catch (e) {
    console.warn(
      "[sendAttendanceRegisterWhatsApp]",
      e instanceof Error ? e.message : e
    );
    return false;
  }
}

export function whatsAppAttendanceNotificationsEnabled(): boolean {
  return isWhatsAppConfigured();
}

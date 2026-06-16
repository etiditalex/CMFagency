import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type QrChannel = "whatsapp" | "website" | "linkedin" | "tiktok" | "custom";

const SUPPORTED_CHANNELS: QrChannel[] = ["whatsapp", "website", "linkedin", "tiktok", "custom"];

function cleanText(value: unknown, max: number) {
  return (typeof value === "string" ? value.trim() : "").slice(0, max);
}

function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function toWhatsappPayload(phoneRaw: string, messageRaw: string) {
  const digits = phoneRaw.replace(/[^\d]/g, "");
  if (!digits) return "";
  const encodedMessage = messageRaw.trim() ? `?text=${encodeURIComponent(messageRaw.trim())}` : "";
  return `https://wa.me/${digits}${encodedMessage}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

    const channel = cleanText(body.channel, 30).toLowerCase() as QrChannel;
    if (!SUPPORTED_CHANNELS.includes(channel)) {
      return NextResponse.json({ error: "Unsupported QR channel." }, { status: 400 });
    }

    const label = cleanText(body.label, 120);
    const phoneNumber = cleanText(body.phoneNumber, 40);
    const whatsappMessage = cleanText(body.whatsappMessage, 500);
    const destinationUrl = cleanText(body.destinationUrl, 2000);

    let qrPayload = "";
    if (channel === "whatsapp") {
      qrPayload = toWhatsappPayload(phoneNumber, whatsappMessage);
      if (!qrPayload) {
        return NextResponse.json({ error: "A valid WhatsApp phone number is required." }, { status: 400 });
      }
    } else {
      const normalized = normalizeUrl(destinationUrl);
      if (!/^https?:\/\/.+/i.test(normalized)) {
        return NextResponse.json({ error: "Enter a valid URL." }, { status: 400 });
      }
      qrPayload = normalized;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin
      .from("fusion_qr_codes")
      .insert({
        channel,
        label: label || null,
        destination_url: channel === "whatsapp" ? null : normalizeUrl(destinationUrl),
        whatsapp_phone: channel === "whatsapp" ? phoneNumber : null,
        whatsapp_message: channel === "whatsapp" ? whatsappMessage || null : null,
        qr_payload: qrPayload,
      })
      .select("id, channel, label, destination_url, whatsapp_phone, whatsapp_message, qr_payload, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        {
          error:
            /relation .*fusion_qr_codes/i.test(error.message)
              ? "QR tables not set up. Run database/ticketing_voting_mvp_patch_77_fusion_qr_codes.sql in Supabase."
              : error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, qrCode: data }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}

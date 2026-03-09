import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPurchaseReminderByRef } from "@/lib/send-purchase-reminder";

/**
 * Sends a one-time "your payment wasn't completed" reminder email to the buyer.
 * Idempotent: if reminder was already sent for this ref, returns alreadySent.
 * Call when user sees failed/abandoned payment (e.g. from [slug] or cart).
 */
export async function POST(req: Request) {
  let body: { ref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const ref = (body.ref ?? "").trim();
  if (!ref) return NextResponse.json({ error: "Missing ref" }, { status: 400 });
  if (!/^[A-Za-z0-9._-]{6,128}$/.test(ref)) {
    return NextResponse.json({ error: "Invalid ref" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const result = await sendPurchaseReminderByRef(ref, supabase);

  if (result.alreadySent) {
    return NextResponse.json({ sent: false, alreadySent: true });
  }
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to send reminder" },
      { status: result.error?.includes("not configured") ? 503 : 502 }
    );
  }
  return NextResponse.json({ sent: true });
}

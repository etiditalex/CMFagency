import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendReceiptEmail } from "@/lib/send-receipt-email";

/**
 * POST: Admin-only. Mark a pending M-Pesa transaction as success and fulfill (tickets/votes + receipt email).
 * Use when the Daraja callback did not run (e.g. URL unreachable) but the customer has paid.
 * Body: { reference: "cmf_xxx" }
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Missing authorization" }, { status: 401 });

    let body: { reference?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const reference = String(body?.reference ?? "").trim();
    if (!reference) return NextResponse.json({ error: "Missing reference" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !callerData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    const callerId = String(callerData.user.id ?? "");
    const { data: memberRow } = await admin.from("portal_members").select("role").eq("user_id", callerId).maybeSingle();
    const isFullAdmin = memberRow?.role === "admin";
    const isLegacyAdmin = !memberRow
      ? (await admin.from("admin_users").select("user_id").eq("user_id", callerId).maybeSingle()).data != null
      : false;
    if (!isFullAdmin && !isLegacyAdmin) {
      return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    }

    const { data: tx, error: txErr } = await admin
      .from("transactions")
      .select("id,campaign_id,campaign_type,contestant_id,quantity,amount,currency,reference,status,fulfilled_at,metadata,email,payer_name,coupon_id")
      .eq("reference", reference)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (tx.status !== "pending") {
      return NextResponse.json({ error: "Transaction is not pending", status: tx.status }, { status: 400 });
    }
    if (String((tx as { provider?: string }).provider ?? "") !== "daraja") {
      return NextResponse.json({ error: "Only M-Pesa (daraja) transactions can be confirmed here" }, { status: 400 });
    }

    const meta = typeof tx.metadata === "object" && tx.metadata ? (tx.metadata as Record<string, unknown>) : {};

    await admin
      .from("transactions")
      .update({
        status: "success",
        verified_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("id", tx.id);

    if (!tx.fulfilled_at) {
      if (tx.campaign_type === "vote" && tx.contestant_id) {
        await admin.from("votes").upsert(
          {
            transaction_id: tx.id,
            campaign_id: tx.campaign_id,
            contestant_id: tx.contestant_id,
            votes: tx.quantity,
          },
          { onConflict: "transaction_id", ignoreDuplicates: true }
        );
      } else {
        await admin.from("ticket_issues").upsert(
          {
            transaction_id: tx.id,
            campaign_id: tx.campaign_id,
            quantity: tx.quantity,
          },
          { onConflict: "transaction_id", ignoreDuplicates: true }
        );
      }
      await admin
        .from("transactions")
        .update({ fulfilled_at: new Date().toISOString() } as Record<string, unknown>)
        .eq("id", tx.id)
        .is("fulfilled_at", null);

      const couponId = (tx as { coupon_id?: string | null }).coupon_id;
      if (couponId) {
        const { data: cou } = await admin.from("coupons").select("used_count").eq("id", couponId).single();
        if (cou) {
          const nextCount = ((cou as { used_count: number }).used_count ?? 0) + 1;
          await admin.from("coupons").update({ used_count: nextCount }).eq("id", couponId);
        }
      }
    }

    const toEmail = (tx as { email?: string | null }).email?.trim?.();
    if (toEmail) {
      const holderName = (tx as { payer_name?: string | null }).payer_name?.trim?.() || toEmail;
      const ticketSuffix = reference.replace(/^cmf_/, "").slice(-8).toUpperCase();
      const slug = String(meta.slug || meta.campaign_slug || "event");
      const prefix = slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      const typeCode = tx.campaign_type === "vote" ? "VOT" : (meta as { merchandise_cart?: boolean }).merchandise_cart ? "ORD" : "TKT";
      const ticketNumber = `${prefix}-${typeCode}-${ticketSuffix}`;
      const campaignTitle = String(meta.campaign_title || meta.slug || "Event");
      const typeLabel = (tx.campaign_type === "vote" ? "Vote" : (meta as { merchandise_cart?: boolean }).merchandise_cart ? "Order" : "Ticket") as "Ticket" | "Vote" | "Order";
      const quantityLabel = tx.campaign_type === "vote" ? "votes" : (meta as { merchandise_cart?: boolean }).merchandise_cart ? "items" : "tickets";
      const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
      const viewTicketsUrl = slug && slug !== "event" ? `${baseUrl}/${slug}?ref=${encodeURIComponent(reference)}` : undefined;
      const downloadReceiptUrl = `${baseUrl}/receipt?ref=${encodeURIComponent(reference)}`;

      let eventLocation: string | undefined;
      let eventDate: string | undefined;
      let eventTime: string | undefined;
      if (slug && slug !== "event") {
        const { data: eventRow } = await admin
          .from("fusion_events")
          .select("location, venue, event_date, time")
          .eq("ticket_campaign_slug", slug)
          .maybeSingle();
        if (eventRow) {
          const loc = (eventRow as { location?: string | null }).location;
          const venue = (eventRow as { venue?: string | null }).venue;
          eventLocation = venue && loc ? `${venue}, ${loc}` : loc || venue || undefined;
          const ed = (eventRow as { event_date?: string | null }).event_date;
          if (ed) eventDate = new Date(ed).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
          eventTime = (eventRow as { time?: string | null }).time ?? undefined;
        }
      }

      await sendReceiptEmail({
        to: toEmail,
        campaignTitle,
        typeLabel,
        ticketNumber,
        holderName,
        amount: `KES ${Number(tx.amount || 0).toLocaleString()}`,
        quantity: `${tx.quantity} ${quantityLabel}`,
        reference,
        variant: "mpesa",
        viewTicketsUrl,
        downloadReceiptUrl,
        eventLocation,
        eventDate,
        eventTime,
      });
    }

    return NextResponse.json({ ok: true, message: "Transaction marked success and fulfilled." });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

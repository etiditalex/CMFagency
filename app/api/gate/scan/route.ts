import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Gate scan: validate receipt/QR by reference.
 * - First scan: set checked_in_at, return valid + name + ticket/vote ID.
 * - Duplicate scan: return duplicate + name + ID + first check-in time (deny entry).
 * Requires portal member with reports (or admin).
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
      return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: pm } = await supabaseAdmin
      .from("portal_members")
      .select("role, features")
      .eq("user_id", user.id)
      .maybeSingle();
    const { data: au } = await supabaseAdmin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
    const isPortal = !!pm || !!au;
    const isAdmin = !!au || (!!pm && (pm.role === "admin" || pm.role === "manager"));
    const hasReports = isAdmin || (Array.isArray((pm as { features?: string[] })?.features) && (pm as { features?: string[] }).features?.includes("reports"));

    if (!isPortal || !hasReports) {
      return NextResponse.json({ error: "Gate access requires reports permission" }, { status: 403 });
    }

    const body = (await req.json()) as { ref?: string };
    const ref = (body.ref ?? "").trim();
    if (!ref) return NextResponse.json({ error: "Missing ref" }, { status: 400 });
    if (!/^[A-Za-z0-9._-]{5,160}$/.test(ref)) {
      return NextResponse.json({ error: "Invalid ref" }, { status: 400 });
    }

    const { data: tx, error } = await supabaseAdmin
      .from("transactions")
      .select("id, reference, payer_name, email, status, campaign_type, metadata, checked_in_at")
      .eq("reference", ref)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Paid ticket: resolve from transactions
    if (tx) {

      if ((tx as { status?: string }).status !== "success") {
        return NextResponse.json({ error: "Transaction not paid" }, { status: 400 });
      }

      const meta = (typeof (tx as { metadata?: unknown }).metadata === "object" && (tx as { metadata?: Record<string, unknown> }).metadata) || {};
      const slug = (meta.slug as string) || "event";
      const suffix = ref.replace(/^cmf_/, "").slice(-8).toUpperCase();
      const prefix = String(slug).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      const typeCode = (tx as { campaign_type?: string }).campaign_type === "vote" ? "VOT" : meta.merchandise_cart ? "ORD" : "TKT";
      const ticketOrVoteId = `${prefix}-${typeCode}-${suffix}`;
      const name = (tx as { payer_name?: string | null }).payer_name?.trim?.() || (tx as { email?: string | null }).email?.trim?.() || "—";
      const checkedInAt = (tx as { checked_in_at?: string | null }).checked_in_at;

      if (checkedInAt) {
        return NextResponse.json(
          {
            valid: false,
            duplicate: true,
            name,
            ticketId: ticketOrVoteId,
            voteId: (tx as { campaign_type?: string }).campaign_type === "vote" ? ticketOrVoteId : undefined,
            checked_in_at: checkedInAt,
            message: "This receipt was already used. Do not allow entry.",
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      const { error: updateErr } = await supabaseAdmin
        .from("transactions")
        .update({ checked_in_at: new Date().toISOString() })
        .eq("id", (tx as { id: string }).id);

      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

      return NextResponse.json(
        {
          valid: true,
          duplicate: false,
          name,
          ticketId: ticketOrVoteId,
          voteId: (tx as { campaign_type?: string }).campaign_type === "vote" ? ticketOrVoteId : undefined,
          message: "Valid. Allow entry.",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Free registration: resolve from event_attendees (no transaction)
    const { data: attendee, error: attendeeErr } = await supabaseAdmin
      .from("event_attendees")
      .select("id, reference, name, email, checked_in_at")
      .eq("reference", ref)
      .is("transaction_id", null)
      .maybeSingle();

    if (attendeeErr) return NextResponse.json({ error: attendeeErr.message }, { status: 500 });
    if (!attendee) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });

    const regName = (attendee as { name?: string | null }).name?.trim?.() || (attendee as { email?: string | null }).email?.trim?.() || "—";
    const regCheckedInAt = (attendee as { checked_in_at?: string | null }).checked_in_at;
    const regId = `REG-${ref.replace(/^reg_/, "").replace(/-/g, "").slice(-10).toUpperCase()}`;

    if (regCheckedInAt) {
      return NextResponse.json(
        {
          valid: false,
          duplicate: true,
          name: regName,
          ticketId: regId,
          checked_in_at: regCheckedInAt,
          message: "This registration was already used. Do not allow entry.",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const { error: updateRegErr } = await supabaseAdmin
      .from("event_attendees")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("id", (attendee as { id: string }).id);

    if (updateRegErr) return NextResponse.json({ error: updateRegErr.message }, { status: 500 });

    return NextResponse.json(
      {
        valid: true,
        duplicate: false,
        name: regName,
        ticketId: regId,
        message: "Valid. Allow entry.",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[gate/scan]", e);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}

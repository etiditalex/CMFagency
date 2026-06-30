import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { contactFromTransactionMetadata } from "@/lib/transaction-contact";

type CmfaScanRow = {
  id: string;
  reference?: string;
  name?: string | null;
  email?: string | null;
  status?: string;
  checked_in_at?: string | null;
};

function cmfaDisplayName(row: CmfaScanRow): string {
  return row.name?.trim?.() || row.email?.trim?.() || "—";
}

function cmfaTicketIdFromRef(reference: string, fallbackRef: string): string {
  const cmfaRefStr = String(reference || fallbackRef);
  return `CMFA-${cmfaRefStr.replace(/^cmfa_reg_/, "").replace(/-/g, "").slice(-10).toUpperCase()}`;
}

function cmfaStatusDenial(row: CmfaScanRow, fallbackRef: string) {
  const status = String(row.status ?? "");
  const name = cmfaDisplayName(row);
  const ticketId = cmfaTicketIdFromRef(String(row.reference ?? ""), fallbackRef);
  const message =
    status === "rejected"
      ? "Registration rejected. Ticket is no longer valid — do not allow entry."
      : status === "pending"
        ? "Registration pending approval. Do not allow entry."
        : "Registration not approved. Do not allow entry.";

  return NextResponse.json(
    {
      valid: false,
      duplicate: false,
      rejected: status === "rejected",
      pending: status === "pending",
      name,
      ticketId,
      message,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

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
      .select("id, reference, payer_name, email, status, campaign_type, metadata, checked_in_at, revoked_at")
      .eq("reference", ref)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Paid ticket: resolve from transactions
    if (tx) {

      if ((tx as { status?: string }).status !== "success") {
        return NextResponse.json({ error: "Transaction not paid" }, { status: 400 });
      }

      const revokedAt = (tx as { revoked_at?: string | null }).revoked_at;
      if (revokedAt) {
        const meta =
          (typeof (tx as { metadata?: unknown }).metadata === "object" &&
            (tx as { metadata?: Record<string, unknown> }).metadata) ||
          {};
        const slug = (meta.slug as string) || "event";
        const suffix = ref.replace(/^cmf_/, "").slice(-8).toUpperCase();
        const prefix = String(slug).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
        const typeCode =
          (tx as { campaign_type?: string }).campaign_type === "vote"
            ? "VOT"
            : meta.merchandise_cart
              ? "ORD"
              : "TKT";
        const ticketOrVoteId = `${prefix}-${typeCode}-${suffix}`;
        const name =
          (tx as { payer_name?: string | null }).payer_name?.trim?.() ||
          (tx as { email?: string | null }).email?.trim?.() ||
          "—";
        return NextResponse.json(
          {
            valid: false,
            duplicate: false,
            revoked: true,
            name,
            ticketId: ticketOrVoteId,
            message: "Ticket revoked. Do not allow entry.",
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      const meta = (typeof (tx as { metadata?: unknown }).metadata === "object" && (tx as { metadata?: Record<string, unknown> }).metadata) || {};
      const slug = (meta.slug as string) || "event";
      const suffix = ref.replace(/^cmf_/, "").slice(-8).toUpperCase();
      const prefix = String(slug).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      const typeCode = (tx as { campaign_type?: string }).campaign_type === "vote" ? "VOT" : meta.merchandise_cart ? "ORD" : "TKT";
      const ticketOrVoteId = `${prefix}-${typeCode}-${suffix}`;
      const name = (tx as { payer_name?: string | null }).payer_name?.trim?.() || (tx as { email?: string | null }).email?.trim?.() || "—";
      const contact = contactFromTransactionMetadata(meta);
      const checkedInAt = (tx as { checked_in_at?: string | null }).checked_in_at;

      const contactPayload = {
        payer_phone: contact.payer_phone,
        referred_by: contact.referred_by,
        referrer_phone: contact.referrer_phone,
      };

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
            ...contactPayload,
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
          ...contactPayload,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Free registration: resolve from event_attendees (no transaction)
    let attendee: { id: string; reference?: string; name?: string | null; email?: string | null; checked_in_at?: string | null } | null = null;
    let attendeeErr: { message: string } | null = null;

    const byRef = await supabaseAdmin
      .from("event_attendees")
      .select("id, reference, name, email, checked_in_at")
      .eq("reference", ref)
      .is("transaction_id", null)
      .maybeSingle();
    attendee = byRef.data;
    attendeeErr = byRef.error;

    // If QR contained REG-XXXXXXXX (ticket ID) instead of full reference, look up by suffix
    if (!attendeeErr && !attendee && /^REG-[A-Z0-9]{8}$/i.test(ref)) {
      const hex = ref.replace(/^REG-/i, "").toLowerCase();
      const bySuffix = await supabaseAdmin
        .from("event_attendees")
        .select("id, reference, name, email, checked_in_at")
        .is("transaction_id", null)
        .filter("reference", "ilike", "%\\_" + hex)
        .maybeSingle();
      attendee = bySuffix.data;
      attendeeErr = bySuffix.error;
    }

    if (attendeeErr) return NextResponse.json({ error: attendeeErr.message }, { status: 500 });
    if (!attendee) {
      // CMFA complimentary registration — status must be approved before check-in
      let cmfaReg: CmfaScanRow | null = null;
      let cmfaErr: { message: string } | null = null;

      const byCmfaRef = await supabaseAdmin
        .from("cmfa_registrations")
        .select("id, reference, name, email, status, checked_in_at")
        .eq("reference", ref)
        .maybeSingle();
      cmfaReg = byCmfaRef.data as CmfaScanRow | null;
      cmfaErr = byCmfaRef.error;

      if (!cmfaErr && !cmfaReg && /^CMFA-[A-Z0-9]{8,12}$/i.test(ref)) {
        const hex = ref.replace(/^CMFA-/i, "").toLowerCase();
        const byCmfaSuffix = await supabaseAdmin
          .from("cmfa_registrations")
          .select("id, reference, name, email, status, checked_in_at")
          .filter("reference", "ilike", "%\\_" + hex)
          .maybeSingle();
        cmfaReg = byCmfaSuffix.data as CmfaScanRow | null;
        cmfaErr = byCmfaSuffix.error;
      }

      if (cmfaErr) return NextResponse.json({ error: cmfaErr.message }, { status: 500 });
      if (!cmfaReg) return NextResponse.json({ error: "Ticket or registration not found" }, { status: 404 });

      if (cmfaReg.status !== "approved") {
        return cmfaStatusDenial(cmfaReg, ref);
      }

      const cmfaName = cmfaDisplayName(cmfaReg);
      const cmfaCheckedInAt = cmfaReg.checked_in_at;
      const cmfaId = cmfaTicketIdFromRef(String(cmfaReg.reference ?? ""), ref);
      const cmfaRegId = cmfaReg.id;

      if (cmfaCheckedInAt) {
        return NextResponse.json(
          {
            valid: false,
            duplicate: true,
            name: cmfaName,
            ticketId: cmfaId,
            checked_in_at: cmfaCheckedInAt,
            message: "This registration was already used. Do not allow entry.",
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      const checkInNow = new Date().toISOString();
      const { data: checkedInRow, error: updateCmfaErr } = await supabaseAdmin
        .from("cmfa_registrations")
        .update({ checked_in_at: checkInNow })
        .eq("id", cmfaRegId)
        .eq("status", "approved")
        .is("checked_in_at", null)
        .select("checked_in_at")
        .maybeSingle();

      if (updateCmfaErr) return NextResponse.json({ error: updateCmfaErr.message }, { status: 500 });

      if (!checkedInRow) {
        const { data: existing } = await supabaseAdmin
          .from("cmfa_registrations")
          .select("id, reference, name, email, status, checked_in_at")
          .eq("id", cmfaRegId)
          .maybeSingle();

        const fresh = existing as CmfaScanRow | null;
        if (!fresh || fresh.status !== "approved") {
          return cmfaStatusDenial(fresh ?? cmfaReg, ref);
        }

        if (fresh.checked_in_at) {
          return NextResponse.json(
            {
              valid: false,
              duplicate: true,
              name: cmfaDisplayName(fresh),
              ticketId: cmfaTicketIdFromRef(String(fresh.reference ?? ""), ref),
              checked_in_at: fresh.checked_in_at,
              message: "This registration was already used. Do not allow entry.",
            },
            { headers: { "Cache-Control": "no-store" } }
          );
        }

        return NextResponse.json(
          {
            valid: false,
            duplicate: false,
            name: cmfaName,
            ticketId: cmfaId,
            message: "Could not confirm entry. Scan again or check registration status.",
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      return NextResponse.json(
        {
          valid: true,
          duplicate: false,
          name: cmfaName,
          ticketId: cmfaId,
          message: "Valid. Allow entry.",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

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

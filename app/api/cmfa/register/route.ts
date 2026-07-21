import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

import {
  CMFA_EVENT_SLUG,
  isCmfaDesignation,
  type CmfaDesignation,
} from "@/lib/cmfa-registration";

export const runtime = "nodejs";

function generateRef(): string {
  return `cmfa_reg_${randomBytes(4).toString("hex")}`;
}

function isValidEmail(s: string): boolean {
  const v = s.trim();
  return v.includes("@") && v.includes(".") && v.length <= 254;
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function isUniqueViolationOnName(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return m.includes("event_name_active") || m.includes("lower(regexp_replace");
}

type GuestPayload = {
  name?: string;
  email?: string;
  phone?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    phone?: string;
    designation?: string;
    is_kpc_student?: boolean | string;
    guest?: GuestPayload | null;
  } | null;

  const name = (body?.name ?? "").trim();
  const email = (body?.email ?? "").trim().toLowerCase();
  const phone = (body?.phone ?? "").trim() || null;
  const designation = (body?.designation ?? "").trim() as CmfaDesignation;
  const isKpcStudent =
    body?.is_kpc_student === true || String(body?.is_kpc_student ?? "").toLowerCase() === "true";

  if (!name || !email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Full name and a valid email are required." }, { status: 400 });
  }

  if (!isCmfaDesignation(designation)) {
    return NextResponse.json({ error: "Please select a valid designation/role." }, { status: 400 });
  }

  const guestRaw = body?.guest;
  let guest: { name: string; email: string; phone: string | null } | null = null;

  if (designation === "cmf_executive" && guestRaw) {
    const guestName = (guestRaw.name ?? "").trim();
    const guestEmail = (guestRaw.email ?? "").trim().toLowerCase();
    const guestPhone = (guestRaw.phone ?? "").trim() || null;

    if (guestName || guestEmail || guestPhone) {
      if (!guestName || !guestEmail || !isValidEmail(guestEmail)) {
        return NextResponse.json(
          { error: "Guest full name and a valid email are required when adding a companion." },
          { status: 400 }
        );
      }
      if (guestEmail === email) {
        return NextResponse.json(
          { error: "Guest email must be different from your email." },
          { status: 400 }
        );
      }
      if (normalizeName(guestName) === normalizeName(name)) {
        return NextResponse.json(
          { error: "Guest name must be different from your name." },
          { status: 400 }
        );
      }
      guest = { name: guestName, email: guestEmail, phone: guestPhone };
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  async function activeRegistrationMessage(forEmail: string): Promise<string | null> {
    const { data } = await supabase
      .from("cmfa_registrations")
      .select("status")
      .eq("event_slug", CMFA_EVENT_SLUG)
      .eq("email", forEmail)
      .in("status", ["pending", "approved"])
      .maybeSingle();

    if (!data) return null;
    if ((data as { status: string }).status === "pending") {
      return "This email already has a pending CMFA registration. Please wait for approval or contact the CMF team.";
    }
    return "This email is already registered and approved for CMFA.";
  }

  async function activeNameMessage(forName: string): Promise<string | null> {
    const normalized = normalizeName(forName);
    const { data } = await supabase
      .from("cmfa_registrations")
      .select("status, name")
      .eq("event_slug", CMFA_EVENT_SLUG)
      .in("status", ["pending", "approved"]);

    const match = (data ?? []).find(
      (row) => normalizeName((row as { name: string }).name) === normalized
    );
    if (!match) return null;
    if ((match as { status: string }).status === "pending") {
      return "This name already has a pending CMFA registration. Each person can only register once.";
    }
    return "This name is already registered for CMFA. Each person can only register once.";
  }

  const mainDup = await activeRegistrationMessage(email);
  if (mainDup) {
    return NextResponse.json({ error: mainDup }, { status: 409 });
  }

  const mainNameDup = await activeNameMessage(name);
  if (mainNameDup) {
    return NextResponse.json({ error: mainNameDup }, { status: 409 });
  }

  if (guest) {
    const guestDup = await activeRegistrationMessage(guest.email);
    if (guestDup) {
      return NextResponse.json(
        { error: `Guest email: ${guestDup}` },
        { status: 409 }
      );
    }
    const guestNameDup = await activeNameMessage(guest.name);
    if (guestNameDup) {
      return NextResponse.json(
        { error: `Guest name: ${guestNameDup}` },
        { status: 409 }
      );
    }
  }

  if (isKpcStudent) {
    const { count, error: kpcCountErr } = await supabase
      .from("cmfa_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_slug", CMFA_EVENT_SLUG)
      .eq("is_kpc_student", true)
      .in("status", ["pending", "approved"]);

    if (kpcCountErr) {
      return NextResponse.json({ error: kpcCountErr.message ?? "Registration failed." }, { status: 500 });
    }

    if ((count ?? 0) >= 10) {
      return NextResponse.json(
        {
          error: "The first 10 KPC student complimentary slots are already full. Please pay KES 300 for a regular ticket.",
          requires_payment: true,
          payment_amount: 300,
          payment_url: "/kcm/cfm-tickets",
        },
        { status: 402 }
      );
    }
  }

  const mainReference = generateRef();
  const mainRow = {
    reference: mainReference,
    event_slug: CMFA_EVENT_SLUG,
    name,
    email,
    phone,
    designation,
    status: "pending",
    is_guest: false,
    is_kpc_student: isKpcStudent,
    parent_registration_id: null,
  };

  const { data: mainInsert, error: mainErr } = await supabase
    .from("cmfa_registrations")
    .insert(mainRow)
    .select("id, reference")
    .single();

  if (mainErr || !mainInsert) {
    if (mainErr?.code === "23505") {
      const onName = isUniqueViolationOnName(mainErr.message);
      return NextResponse.json(
        {
          error: onName
            ? "This name is already registered for CMFA. Each person can only register once."
            : "This email is already registered for CMFA.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: mainErr?.message ?? "Registration failed." }, { status: 500 });
  }

  let guestReference: string | null = null;

  if (guest) {
    guestReference = generateRef();
    const { error: guestErr } = await supabase.from("cmfa_registrations").insert({
      reference: guestReference,
      event_slug: CMFA_EVENT_SLUG,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      designation: "cmf_executive",
      status: "pending",
      is_guest: true,
      is_kpc_student: false,
      parent_registration_id: (mainInsert as { id: string }).id,
    });

    if (guestErr) {
      await supabase.from("cmfa_registrations").delete().eq("id", (mainInsert as { id: string }).id);
      if (guestErr.code === "23505") {
        const onName = isUniqueViolationOnName(guestErr.message);
        return NextResponse.json(
          {
            error: onName
              ? "The guest name is already registered for CMFA. Each person can only register once."
              : "The guest email is already registered for CMFA.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: guestErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    reference: mainReference,
    guest_reference: guestReference,
    message:
      "Registration submitted. You will receive your complimentary ticket by email once approved by the CMF team.",
  });
}

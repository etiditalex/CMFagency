import { NextRequest, NextResponse } from "next/server";

import { isMissingEmployeesTable } from "@/lib/employees/db-mapper";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";

function safeText(v: unknown, max: number) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  return s.slice(0, max);
}

export type NotificationAdminRecord = {
  id: string;
  email: string;
  fullName: string;
  notifySignIn: boolean;
  notifySignOut: boolean;
  createdAt: string;
};

function mapRow(row: {
  id: string;
  email: string;
  full_name: string | null;
  notify_sign_in: boolean;
  notify_sign_out: boolean;
  created_at: string;
}): NotificationAdminRecord {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name ?? "",
    notifySignIn: row.notify_sign_in !== false,
    notifySignOut: row.notify_sign_out === true,
    createdAt: row.created_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    let q = admin
      .from("visitor_employee_notification_admins")
      .select("id,email,full_name,notify_sign_in,notify_sign_out,created_at")
      .order("created_at", { ascending: true });

    if (!isAdmin) q = q.eq("owner_id", userId);

    const { data, error } = await q;
    if (error) {
      if (isMissingEmployeesTable(error)) {
        return NextResponse.json({ admins: [], setupRequired: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      admins: ((data ?? []) as Parameters<typeof mapRow>[0][]).map(mapRow),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId } = auth;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const email = safeText(body.email, 200).toLowerCase();
    if (!email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    const { data, error } = await admin
      .from("visitor_employee_notification_admins")
      .insert({
        owner_id: userId,
        email,
        full_name: safeText(body.fullName ?? body.full_name, 120),
        notify_sign_in: body.notifySignIn !== false,
        notify_sign_out: body.notifySignOut === true,
      })
      .select("id,email,full_name,notify_sign_in,notify_sign_out,created_at")
      .single();

    if (error) {
      if (isMissingEmployeesTable(error)) {
        return NextResponse.json(
          { error: "Run database/visitor_employees_patch_02_notification_admins.sql in Supabase." },
          { status: 503 }
        );
      }
      if (/duplicate|unique/i.test(error.message)) {
        return NextResponse.json({ error: "This email is already listed." }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ admin: mapRow(data as Parameters<typeof mapRow>[0]) }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

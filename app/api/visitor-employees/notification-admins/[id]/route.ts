import { NextRequest, NextResponse } from "next/server";

import { isMissingEmployeesTable } from "@/lib/employees/db-mapper";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";

function safeText(v: unknown, max: number) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  return s.slice(0, max);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    let q = admin.from("visitor_employee_notification_admins").delete().eq("id", id);
    if (!isAdmin) q = q.eq("owner_id", userId);

    const { error } = await q;
    if (error) {
      if (isMissingEmployeesTable(error)) {
        return NextResponse.json({ error: "Notification admins table not set up." }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};

    if ("notifySignIn" in body || "notify_sign_in" in body) {
      patch.notify_sign_in = body.notifySignIn !== false;
    }
    if ("notifySignOut" in body || "notify_sign_out" in body) {
      patch.notify_sign_out = body.notifySignOut !== false;
    }
    if ("notifyWhatsapp" in body || "notify_whatsapp" in body) {
      patch.notify_whatsapp = body.notifyWhatsapp !== false;
    }
    if ("whatsappPhone" in body || "whatsapp_phone" in body) {
      patch.whatsapp_phone = safeText(body.whatsappPhone ?? body.whatsapp_phone, 20).replace(
        /\D/g,
        ""
      );
    }
    if ("fullName" in body || "full_name" in body) {
      patch.full_name = safeText(body.fullName ?? body.full_name, 120);
    }

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    let q = admin.from("visitor_employee_notification_admins").update(patch).eq("id", id);
    if (!isAdmin) q = q.eq("owner_id", userId);

    const { data, error } = await q
      .select("id,email,full_name,notify_sign_in,notify_sign_out,whatsapp_phone,notify_whatsapp,created_at")
      .maybeSingle();

    if (error) {
      if (isMissingEmployeesTable(error)) {
        return NextResponse.json({ error: "Notification admins table not set up." }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Admin not found." }, { status: 404 });

    return NextResponse.json({
      admin: {
        id: data.id,
        email: data.email,
        fullName: data.full_name ?? "",
        notifySignIn: data.notify_sign_in !== false,
        notifySignOut: data.notify_sign_out !== false,
        whatsappPhone: String(data.whatsapp_phone ?? "").replace(/\D/g, ""),
        notifyWhatsapp: data.notify_whatsapp !== false,
        createdAt: data.created_at,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

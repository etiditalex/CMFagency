import { NextRequest, NextResponse } from "next/server";

import { requireAdminOrManager } from "@/lib/fusion-require-admin";
import { isVolunteerStatus } from "@/lib/kfcaa-volunteers";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function applicationId(id: string) {
  const value = id.trim();
  return UUID_RE.test(value) ? value : null;
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOrManager(req);
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const applicationIdValue = applicationId(id ?? "");
  if (!applicationIdValue) return NextResponse.json({ error: "Missing application id." }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { status?: unknown } | null;
  const status = typeof body?.status === "string" ? body.status : "";
  if (!isVolunteerStatus(status)) return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });

  const { error } = await auth.admin.from("kfcaa_volunteer_applications").update({ status }).eq("id", applicationIdValue);
  if (error) {
    console.error("kfcaa volunteer status:", error.message);
    return NextResponse.json({ error: "Could not update the status." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOrManager(req);
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const applicationIdValue = applicationId(id ?? "");
  if (!applicationIdValue) return NextResponse.json({ error: "Missing application id." }, { status: 400 });

  const { error } = await auth.admin.from("kfcaa_volunteer_applications").delete().eq("id", applicationIdValue);
  if (error) {
    console.error("kfcaa volunteer delete:", error.message);
    return NextResponse.json({ error: "Could not delete the application." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

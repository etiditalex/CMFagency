import type { SupabaseClient } from "@supabase/supabase-js";

import type { DeviceFingerprintInput } from "@/lib/employees/device-fingerprint";
import {
  isMissingPreregistrationColumns,
  isMissingVisitorsTable,
  mapVisitorRow,
  VISITOR_SELECT,
  VISITOR_SELECT_BASE,
  type VisitorRow,
} from "@/lib/visitors/db-mapper";
import { normalizeVisitorDevice } from "@/lib/visitors/device";
import { formatCheckInClock, formatCheckInDateLabel } from "@/lib/visitors/format-check-in-display";
import { visitorPhonesMatch } from "@/lib/visitors/phone";
import {
  isPreregisterVisitor,
  ownerIdFromVisitorGateToken,
  parseVisitorGateToken,
  parseVisitorPassToken,
} from "@/lib/visitors/preregistration";
import { resolveCheckInOwner } from "@/lib/visitors/resolve-check-in-owner";
import type { VisitorRecord } from "@/lib/visitors/types";

const SETUP_MESSAGE =
  "Visitor tables not set up. Run database/visitor_management_patch_01.sql in Supabase.";
const PREREG_SETUP_MESSAGE =
  "Run database/visitor_management_patch_11_preregistration.sql in Supabase to enable visitor pre-registration.";

const OPEN_STATUSES = ["pending", "approved"] as const;

export type VisitorScanResult =
  | {
      ok: true;
      visitor: VisitorRecord;
      venueName: string;
      checkedInAt: string;
      timeLabel: string;
      dateLabel: string;
      matchedBy: "device" | "phone";
    }
  | { ok: false; error: string; status: number; needsPhone?: boolean; visitorName?: string };

type VisitorQueryResult = {
  data: unknown;
  error: { message?: string; code?: string } | null;
};

async function selectVisitor(query: (select: string) => PromiseLike<VisitorQueryResult>) {
  const full = await query(VISITOR_SELECT);
  if (!full.error) return full;
  if (isMissingPreregistrationColumns(full.error)) {
    return query(VISITOR_SELECT_BASE);
  }
  return full;
}

function extraDeviceId(visitor: VisitorRecord): string {
  const extra = visitor.formExtra ?? {};
  return String(extra.device_id ?? visitor.registeredDeviceId ?? "").trim();
}

function isOpenPreregistration(visitor: VisitorRecord): boolean {
  if (!isPreregisterVisitor(visitor.source, visitor.formExtra)) {
    if (visitor.status === "pending" || visitor.status === "approved") return true;
  }
  return (
    isPreregisterVisitor(visitor.source, visitor.formExtra) &&
    (visitor.status === "pending" || visitor.status === "approved")
  );
}

export async function lookupVisitorByPassToken(
  admin: SupabaseClient,
  tokenRaw: unknown
): Promise<VisitorScanResult> {
  const token = parseVisitorPassToken(tokenRaw);
  if (!token) {
    return { ok: false, error: "Missing visitor QR token.", status: 400 };
  }

  const { data, error } = await selectVisitor((select) =>
    admin.from("visitors").select(select).eq("qr_code_token", token).maybeSingle()
  );

  if (error) {
    if (isMissingVisitorsTable(error)) {
      return { ok: false, error: SETUP_MESSAGE, status: 503 };
    }
    return { ok: false, error: error.message ?? "Lookup failed", status: 500 };
  }
  if (!data) {
    return { ok: false, error: "Invalid or unknown visitor QR code.", status: 404 };
  }

  return {
    ok: true,
    visitor: mapVisitorRow(data as VisitorRow),
    venueName: "",
    checkedInAt: "",
    timeLabel: "",
    dateLabel: "",
    matchedBy: "device",
  };
}

async function findOpenByDevice(
  admin: SupabaseClient,
  ownerId: string,
  deviceId: string
): Promise<VisitorRecord | null> {
  if (!deviceId || deviceId === "unknown-device") return null;

  const { data, error } = await selectVisitor((select) =>
    admin
      .from("visitors")
      .select(select)
      .eq("owner_id", ownerId)
      .in("status", [...OPEN_STATUSES])
      .order("created_at", { ascending: false })
      .limit(40)
  );

  if (error || !data) return null;
  const rows = (data as VisitorRow[]).map(mapVisitorRow);
  return (
    rows.find(
      (v) => extraDeviceId(v) === deviceId && isOpenPreregistration(v)
    ) ?? null
  );
}

async function findOpenByPhone(
  admin: SupabaseClient,
  ownerId: string,
  phone: string
): Promise<VisitorRecord | null> {
  if (!phone.trim()) return null;

  const { data, error } = await selectVisitor((select) =>
    admin
      .from("visitors")
      .select(select)
      .eq("owner_id", ownerId)
      .in("status", [...OPEN_STATUSES])
      .order("created_at", { ascending: false })
      .limit(80)
  );

  if (error || !data) return null;
  const rows = (data as VisitorRow[]).map(mapVisitorRow);
  return rows.find((v) => visitorPhonesMatch(v.phoneNumber, phone) && isOpenPreregistration(v)) ?? null;
}

export async function processVisitorArrivalScan(
  admin: SupabaseClient,
  input: DeviceFingerprintInput & {
    gate?: unknown;
    gateToken?: unknown;
    token?: unknown;
    qrToken?: unknown;
    phone?: unknown;
    phoneNumber?: unknown;
  }
): Promise<VisitorScanResult> {
  const device = normalizeVisitorDevice(input);
  const phone = String(input.phone ?? input.phoneNumber ?? "").trim();
  const gateToken = parseVisitorGateToken(input.gate ?? input.gateToken);
  const passToken = parseVisitorPassToken(input.token ?? input.qrToken);

  let visitor: VisitorRecord | null = null;
  let matchedBy: "device" | "phone" = "device";
  let ownerId = "";

  if (passToken) {
    const looked = await lookupVisitorByPassToken(admin, passToken);
    if (!looked.ok) return looked;
    visitor = looked.visitor;
    ownerId = "";
    const { data: ownerRow } = await admin
      .from("visitors")
      .select("owner_id")
      .eq("id", visitor.id)
      .maybeSingle();
    ownerId = String((ownerRow as { owner_id?: string } | null)?.owner_id ?? "");
    if (!ownerId) {
      return { ok: false, error: "Visitor record is missing a business owner.", status: 500 };
    }

    const boundDevice = extraDeviceId(visitor);
    const deviceOk = Boolean(boundDevice) && boundDevice === device.deviceId;
    const phoneOk = phone ? visitorPhonesMatch(visitor.phoneNumber, phone) : false;

    if (!deviceOk && !phoneOk) {
      if (!phone) {
        return {
          ok: false,
          error:
            "Use the phone you registered with, or enter the contact number from your pre-registration.",
          status: 403,
          needsPhone: true,
          visitorName: visitor.fullName,
        };
      }
      return {
        ok: false,
        error:
          "This QR does not match the device or contact number used during pre-registration.",
        status: 403,
        needsPhone: true,
        visitorName: visitor.fullName,
      };
    }
    matchedBy = deviceOk ? "device" : "phone";
  } else if (gateToken) {
    const fromGate = ownerIdFromVisitorGateToken(gateToken);
    if (!fromGate) {
      return { ok: false, error: "Invalid reception QR code.", status: 400 };
    }
    ownerId = fromGate;
    visitor = await findOpenByDevice(admin, ownerId, device.deviceId);
    if (visitor) {
      matchedBy = "device";
    } else if (phone) {
      visitor = await findOpenByPhone(admin, ownerId, phone);
      if (!visitor) {
        return {
          ok: false,
          error:
            "No pre-registration found for this contact number. Register first using the shareable link, or check the number.",
          status: 404,
          needsPhone: true,
        };
      }
      matchedBy = "phone";
    } else {
      return {
        ok: false,
        error:
          "We could not recognise this phone. Enter the contact number you used when you pre-registered.",
        status: 404,
        needsPhone: true,
      };
    }
  } else {
    return { ok: false, error: "Scan the reception QR or your visitor pass.", status: 400 };
  }

  if (!visitor) {
    return { ok: false, error: "No matching pre-registration found.", status: 404 };
  }

  if (visitor.status === "checked_in") {
    return { ok: false, error: "This visitor is already checked in.", status: 409 };
  }
  if (visitor.status === "checked_out") {
    return { ok: false, error: "This visit is already complete.", status: 409 };
  }
  if (visitor.status === "rejected") {
    return { ok: false, error: "This pre-registration was rejected.", status: 403 };
  }

  const owner = await resolveCheckInOwner(admin, ownerId);
  if ("error" in owner) {
    return { ok: false, error: owner.error, status: 400 };
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: "checked_in",
    checked_in_at: now,
  };
  if (device.deviceId !== "unknown-device") {
    patch.registered_device_id = extraDeviceId(visitor) || device.deviceId;
    patch.device_label = visitor.deviceLabel || device.deviceLabel;
  }

  let data: unknown = null;
  let error: { message?: string } | null = null;
  {
    const first = await admin
      .from("visitors")
      .update(patch)
      .eq("id", visitor.id)
      .select(VISITOR_SELECT)
      .single();
    data = first.data;
    error = first.error;
  }

  if (error && isMissingPreregistrationColumns(error)) {
    const fallback = await admin
      .from("visitors")
      .update({ status: "checked_in", checked_in_at: now })
      .eq("id", visitor.id)
      .select(VISITOR_SELECT_BASE)
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    if (isMissingVisitorsTable(error)) {
      return { ok: false, error: SETUP_MESSAGE, status: 503 };
    }
    if (isMissingPreregistrationColumns(error)) {
      return { ok: false, error: PREREG_SETUP_MESSAGE, status: 503 };
    }
    return { ok: false, error: error.message ?? "Could not check in visitor", status: 500 };
  }

  const checked = mapVisitorRow(data as VisitorRow);
  const checkedInAt = checked.checkedInAt ?? now;

  return {
    ok: true,
    visitor: checked,
    venueName: owner.venueName,
    checkedInAt,
    timeLabel: formatCheckInClock(checkedInAt),
    dateLabel: formatCheckInDateLabel(checkedInAt),
    matchedBy,
  };
}

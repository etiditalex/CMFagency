import { randomBytes } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";

import {
  BIOMETRIC_SETUP_MESSAGE,
  RIGHT_THUMB,
  type BiometricAttachment,
  isBiometricAttachment,
} from "@/lib/employees/biometric-shared";
import { isMissingEmployeesTable } from "@/lib/employees/db-mapper";
import { lookupEmployeeByToken } from "@/lib/employees/process-employee-scan";
import type { EmployeeRecord } from "@/lib/employees/types";

const CREDENTIALS = "visitor_employee_biometric_credentials";
const CHALLENGES = "visitor_employee_biometric_challenges";
const STATIONS = "visitor_employee_biometric_stations";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const RP_NAME = "Fusion Xpress";

export type BiometricCredentialRow = {
  id: string;
  employee_id: string;
  owner_id: string;
  finger: string;
  credential_id: string;
  public_key: string;
  sign_count: number;
  transports: string[] | null;
  attachment: BiometricAttachment;
  device_label: string | null;
  aaguid: string | null;
  created_at: string;
  last_used_at: string | null;
};

export type BiometricChallengeRow = {
  id: string;
  challenge: string;
  employee_id: string | null;
  owner_id: string | null;
  purpose: "enroll" | "attend";
  attachment: BiometricAttachment;
  station: boolean;
  expires_at: string;
};

export function isMissingBiometricTable(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? "").toLowerCase();
  const code = String((err as { code?: string })?.code ?? "").toUpperCase();
  if (!msg.includes("biometric")) return false;
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    code === "PGRST204" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table") ||
    msg.includes("relation")
  );
}

export function biometricSetupError() {
  return { error: BIOMETRIC_SETUP_MESSAGE, setupRequired: true as const, status: 503 };
}

export function webAuthnRelyingParty(req: NextRequest): { rpID: string; origins: string[] } {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const hostHeader = (forwardedHost ?? req.headers.get("host") ?? "localhost").split(",")[0].trim();
  const hostname = hostHeader.split(":")[0] || "localhost";
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const proto =
    forwardedProto || (hostname === "localhost" || hostname === "127.0.0.1" ? "http" : "https");
  const origins = new Set<string>([`${proto}://${hostHeader}`]);
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (site) {
    try {
      origins.add(new URL(site).origin);
    } catch {
      /* ignore malformed site url */
    }
  }
  return { rpID: hostname, origins: [...origins] };
}

function transportsFor(attachment: BiometricAttachment, stored?: string[] | null): string[] {
  const cleaned = (stored ?? []).map((t) => String(t).trim()).filter(Boolean);
  if (cleaned.length) return cleaned;
  return attachment === "platform" ? ["internal"] : ["usb", "nfc", "ble"];
}

export async function listEmployeeCredentials(
  admin: SupabaseClient,
  employeeId: string
): Promise<BiometricCredentialRow[]> {
  const { data, error } = await admin
    .from(CREDENTIALS)
    .select(
      "id,employee_id,owner_id,finger,credential_id,public_key,sign_count,transports,attachment,device_label,aaguid,created_at,last_used_at"
    )
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BiometricCredentialRow[];
}

export async function credentialsForOwner(
  admin: SupabaseClient,
  ownerId: string
): Promise<Pick<BiometricCredentialRow, "employee_id" | "attachment" | "created_at" | "last_used_at" | "device_label">[]> {
  const { data, error } = await admin
    .from(CREDENTIALS)
    .select("employee_id,attachment,created_at,last_used_at,device_label")
    .eq("owner_id", ownerId);
  if (error) throw error;
  return (data ?? []) as Pick<
    BiometricCredentialRow,
    "employee_id" | "attachment" | "created_at" | "last_used_at" | "device_label"
  >[];
}

export async function ensureBiometricStation(
  admin: SupabaseClient,
  ownerId: string
): Promise<string> {
  const { data: existing, error: findErr } = await admin
    .from(STATIONS)
    .select("station_token")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing?.station_token) return String(existing.station_token);

  const station_token = `FX-BIO-${randomBytes(18).toString("base64url")}`;
  const { error: insErr } = await admin.from(STATIONS).insert({ owner_id: ownerId, station_token });
  if (insErr) {
    const { data: again } = await admin
      .from(STATIONS)
      .select("station_token")
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (again?.station_token) return String(again.station_token);
    throw insErr;
  }
  return station_token;
}

export async function lookupStationOwner(
  admin: SupabaseClient,
  stationToken: string
): Promise<string | null> {
  const token = stationToken.trim();
  if (!token) return null;
  const { data, error } = await admin
    .from(STATIONS)
    .select("owner_id")
    .eq("station_token", token)
    .maybeSingle();
  if (error) throw error;
  return data?.owner_id ? String(data.owner_id) : null;
}

async function purgeExpiredChallenges(admin: SupabaseClient) {
  await admin.from(CHALLENGES).delete().lt("expires_at", new Date().toISOString());
}

async function saveChallenge(
  admin: SupabaseClient,
  row: {
    challenge: string;
    employeeId: string | null;
    ownerId: string | null;
    purpose: "enroll" | "attend";
    attachment: BiometricAttachment;
    station: boolean;
  }
): Promise<string> {
  await purgeExpiredChallenges(admin);
  const { data, error } = await admin
    .from(CHALLENGES)
    .insert({
      challenge: row.challenge,
      employee_id: row.employeeId,
      owner_id: row.ownerId,
      purpose: row.purpose,
      attachment: row.attachment,
      station: row.station,
      expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function loadChallenge(
  admin: SupabaseClient,
  challengeId: string
): Promise<BiometricChallengeRow | null> {
  const id = challengeId.trim();
  if (!id) return null;
  const { data, error } = await admin
    .from(CHALLENGES)
    .select("id,challenge,employee_id,owner_id,purpose,attachment,station,expires_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (new Date(String(data.expires_at)).getTime() < Date.now()) {
    await admin.from(CHALLENGES).delete().eq("id", id);
    return null;
  }
  return data as BiometricChallengeRow;
}

export async function consumeChallenge(admin: SupabaseClient, challengeId: string) {
  await admin.from(CHALLENGES).delete().eq("id", challengeId);
}

export async function resolveEmployeeForBiometric(
  admin: SupabaseClient,
  token: string
): Promise<
  | { ok: true; employee: EmployeeRecord; ownerId: string }
  | { ok: false; error: string; status: number }
> {
  const lookup = await lookupEmployeeByToken(admin, token);
  if (!lookup.ok) return lookup;
  if (lookup.employee.status !== "active") {
    return { ok: false, error: "This staff member is inactive.", status: 403 };
  }
  const { data, error } = await admin
    .from("visitor_employees")
    .select("owner_id")
    .eq("id", lookup.employee.id)
    .maybeSingle();
  if (error) {
    if (isMissingEmployeesTable(error)) {
      return { ok: false, error: "Employee module not set up.", status: 503 };
    }
    return { ok: false, error: error.message, status: 500 };
  }
  if (!data?.owner_id) return { ok: false, error: "Employee not found.", status: 404 };
  return { ok: true, employee: lookup.employee, ownerId: String(data.owner_id) };
}

export async function createEnrollmentOptions(
  admin: SupabaseClient,
  input: {
    rpID: string;
    employee: EmployeeRecord;
    ownerId: string;
    attachment: BiometricAttachment;
  }
) {
  const existing = await listEmployeeCredentials(admin, input.employee.id);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: input.rpID,
    userName: input.employee.employeeCode || input.employee.email || input.employee.id,
    userDisplayName: input.employee.fullName,
    userID: new TextEncoder().encode(input.employee.id),
    attestationType: "none",
    authenticatorSelection: {
      authenticatorAttachment: input.attachment,
      // Phone unlock uses the device screen-lock fingerprint. A required resident key
      // opens the browser passkey sheet (including another-device QR) instead.
      residentKey: input.attachment === "platform" ? "discouraged" : "required",
      userVerification: "required",
    },
    preferredAuthenticatorType: input.attachment === "platform" ? "localDevice" : "securityKey",
    excludeCredentials: existing
      .filter((row) => row.attachment === input.attachment)
      .map((row) => ({
        id: row.credential_id,
        transports: transportsFor(row.attachment, row.transports),
      })),
  });
  if (input.attachment === "platform") options.hints = ["client-device"];
  else options.hints = ["security-key"];

  const challengeId = await saveChallenge(admin, {
    challenge: options.challenge,
    employeeId: input.employee.id,
    ownerId: input.ownerId,
    purpose: "enroll",
    attachment: input.attachment,
    station: false,
  });
  return { challengeId, options, attachment: input.attachment };
}

export async function createAttendanceOptions(
  admin: SupabaseClient,
  input: {
    rpID: string;
    attachment: BiometricAttachment;
    employee?: EmployeeRecord;
    ownerId: string;
    station: boolean;
  }
) {
  const credentials = input.station
    ? []
    : (await listEmployeeCredentials(admin, input.employee!.id)).filter(
        (row) => row.attachment === input.attachment
      );

  if (!input.station && credentials.length === 0) {
    return { needsEnrollment: true as const, attachment: input.attachment };
  }

  const options = await generateAuthenticationOptions({
    rpID: input.rpID,
    userVerification: "required",
    allowCredentials: input.station
      ? undefined
      : credentials.map((row) => ({
          id: row.credential_id,
          transports: transportsFor(row.attachment, row.transports),
        })),
  });
  options.hints = input.attachment === "platform" ? ["client-device"] : ["security-key"];

  const challengeId = await saveChallenge(admin, {
    challenge: options.challenge,
    employeeId: input.station ? null : input.employee!.id,
    ownerId: input.ownerId,
    purpose: "attend",
    attachment: input.attachment,
    station: input.station,
  });
  return { needsEnrollment: false as const, challengeId, options, attachment: input.attachment };
}

export async function verifyAndStoreEnrollment(
  admin: SupabaseClient,
  input: {
    challenge: BiometricChallengeRow;
    response: RegistrationResponseJSON;
    expectedOrigin: string | string[];
    expectedRPID: string;
    deviceLabel?: string;
  }
) {
  if (input.challenge.purpose !== "enroll" || !input.challenge.employee_id || !input.challenge.owner_id) {
    return { ok: false as const, error: "This enrollment prompt is not valid.", status: 400 };
  }

  let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  try {
    verification = await verifyRegistrationResponse({
      response: input.response,
      expectedChallenge: input.challenge.challenge,
      expectedOrigin: input.expectedOrigin,
      expectedRPID: input.expectedRPID,
      requireUserVerification: true,
    });
  } catch (e: unknown) {
    return { ok: false as const, error: publicCeremonyError(e), status: 400 };
  }

  if (!verification.verified || !verification.registrationInfo.userVerified) {
    return {
      ok: false as const,
      error: "The sensor did not verify your right thumb. Place your right thumb on the scanner and try again.",
      status: 400,
    };
  }

  const credential = verification.registrationInfo.credential;
  const attachment = isBiometricAttachment(input.response.authenticatorAttachment)
    ? input.response.authenticatorAttachment
    : input.challenge.attachment;
  const transports =
    attachment === "platform"
      ? ["internal"]
      : input.response.response.transports ?? transportsFor(attachment);

  const { error: deleteErr } = await admin
    .from(CREDENTIALS)
    .delete()
    .eq("employee_id", input.challenge.employee_id)
    .eq("attachment", attachment);
  if (deleteErr) throw deleteErr;

  const { error: insertErr } = await admin.from(CREDENTIALS).insert({
    employee_id: input.challenge.employee_id,
    owner_id: input.challenge.owner_id,
    finger: RIGHT_THUMB,
    credential_id: credential.id,
    public_key: isoBase64URL.fromBuffer(credential.publicKey),
    sign_count: credential.counter,
    transports,
    attachment,
    device_label: String(input.deviceLabel ?? "").trim().slice(0, 200) || null,
    aaguid: verification.registrationInfo.aaguid || null,
  });
  if (insertErr) throw insertErr;

  return { ok: true as const, attachment, finger: RIGHT_THUMB };
}

export async function verifyAttendanceCredential(
  admin: SupabaseClient,
  input: {
    challenge: BiometricChallengeRow;
    response: AuthenticationResponseJSON;
    expectedOrigin: string | string[];
    expectedRPID: string;
  }
): Promise<
  | { ok: true; employeeId: string; ownerId: string; attachment: BiometricAttachment }
  | { ok: false; error: string; status: number }
> {
  if (input.challenge.purpose !== "attend") {
    return { ok: false, error: "This fingerprint prompt is not valid.", status: 400 };
  }

  const credentialId = input.response.id;
  const { data: row, error } = await admin
    .from(CREDENTIALS)
    .select(
      "id,employee_id,owner_id,finger,credential_id,public_key,sign_count,transports,attachment,device_label,aaguid,created_at,last_used_at"
    )
    .eq("credential_id", credentialId)
    .maybeSingle();
  if (error) throw error;
  if (!row) {
    return {
      ok: false,
      error: "This right thumb is not recorded. Open your biometric link and record your right thumb first.",
      status: 404,
    };
  }

  const credential = row as BiometricCredentialRow;
  if (credential.finger !== RIGHT_THUMB) {
    return { ok: false, error: "Only a recorded right thumb can be used for attendance.", status: 403 };
  }
  if (input.challenge.employee_id && input.challenge.employee_id !== credential.employee_id) {
    return { ok: false, error: "This fingerprint belongs to a different employee.", status: 403 };
  }
  if (input.challenge.owner_id && input.challenge.owner_id !== credential.owner_id) {
    return { ok: false, error: "This fingerprint is not registered with this organisation.", status: 403 };
  }

  let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
  try {
    verification = await verifyAuthenticationResponse({
      response: input.response,
      expectedChallenge: input.challenge.challenge,
      expectedOrigin: input.expectedOrigin,
      expectedRPID: input.expectedRPID,
      requireUserVerification: true,
      credential: {
        id: credential.credential_id,
        publicKey: isoBase64URL.toBuffer(credential.public_key),
        counter: Number(credential.sign_count) || 0,
        transports: transportsFor(credential.attachment, credential.transports),
      },
    });
  } catch (e: unknown) {
    return { ok: false, error: publicCeremonyError(e), status: 400 };
  }

  if (!verification.verified || !verification.authenticationInfo.userVerified) {
    return {
      ok: false,
      error: "The sensor did not verify your right thumb. Place your right thumb on the scanner and try again.",
      status: 400,
    };
  }

  const { error: updateErr } = await admin
    .from(CREDENTIALS)
    .update({
      sign_count: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", credential.id);
  if (updateErr) throw updateErr;

  return {
    ok: true,
    employeeId: credential.employee_id,
    ownerId: credential.owner_id,
    attachment: credential.attachment,
  };
}

export async function deleteEmployeeCredentials(admin: SupabaseClient, employeeId: string, ownerId: string) {
  const { error } = await admin
    .from(CREDENTIALS)
    .delete()
    .eq("employee_id", employeeId)
    .eq("owner_id", ownerId);
  if (error) throw error;
}

function publicCeremonyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (/challenge/i.test(msg)) return "This fingerprint prompt expired. Try again.";
  if (/origin|rp id|rpid/i.test(msg)) {
    return "This page cannot use the fingerprint scanner. Open the link from your organisation.";
  }
  if (/user verification|verified/i.test(msg)) {
    return "The sensor did not verify your right thumb.";
  }
  return "Fingerprint could not be verified. Place your right thumb on the sensor and try again.";
}

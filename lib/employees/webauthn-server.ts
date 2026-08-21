import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";

import {
  BIOMETRIC_NOT_REGISTERED_MESSAGE,
  BIOMETRIC_SETUP_MESSAGE,
  createBiometricTemplateMaterial,
  DEFAULT_BIOMETRIC_FINGER_INDEX,
  fingerLabelForIndex,
  isMissingBiometricTable,
} from "@/lib/employees/biometric";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const CREDENTIAL_SELECT =
  "id,owner_id,employee_id,credential_id,public_key,device_label,device_id,sign_count,transports,webauthn_user_id,aaguid,status,created_at,last_used_at";
const ENROLLMENT_SELECT =
  "id,owner_id,employee_id,finger_index,finger_label,status,vendor,external_id,enrolled_at,last_matched_at,revoked_at";

const TRANSPORTS: ReadonlySet<string> = new Set([
  "ble",
  "cable",
  "hybrid",
  "internal",
  "nfc",
  "smart-card",
  "usb",
]);

export type StoredWebAuthnCredential = {
  id: string;
  ownerId: string;
  employeeId: string;
  credentialId: string;
  publicKey: string;
  deviceLabel: string;
  deviceId: string | null;
  signCount: number;
  transports: AuthenticatorTransportFuture[];
  webauthnUserId: string | null;
  aaguid: string | null;
};

export type WebAuthnRpConfig = {
  rpName: string;
  rpID: string;
  expectedOrigin: string[];
};

export function isMissingWebAuthnTable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return (
    msg.includes("visitor_employee_webauthn") ||
    msg.includes("webauthn_credentials") ||
    msg.includes("webauthn_challenges") ||
    (msg.includes("does not exist") && msg.toLowerCase().includes("webauthn"))
  );
}

export function isMissingWebAuthnOrBiometricTable(error: unknown): boolean {
  return isMissingWebAuthnTable(error) || isMissingBiometricTable(error);
}

export function resolveWebAuthnRp(req: NextRequest): WebAuthnRpConfig {
  const envRp = process.env.WEBAUTHN_RP_ID?.trim() || "";
  const envOrigin = (process.env.WEBAUTHN_ORIGIN ?? "").trim().replace(/\/$/, "");
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
  const requestOrigin = req.nextUrl.origin.replace(/\/$/, "");

  const origins = new Set<string>();
  if (envOrigin) origins.add(envOrigin);
  if (site) origins.add(site);
  if (requestOrigin) origins.add(requestOrigin);

  let rpID = envRp;
  if (!rpID) {
    const source = site || requestOrigin;
    try {
      rpID = new URL(source).hostname;
    } catch {
      rpID = req.nextUrl.hostname;
    }
  }

  return {
    rpName: "Fusion Xpress Attendance",
    rpID,
    expectedOrigin: Array.from(origins),
  };
}

function uint8ToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function base64UrlToUint8(value: string): Uint8Array {
  const src = Buffer.from(value, "base64url");
  const copy = new Uint8Array(src.byteLength);
  copy.set(src);
  return copy;
}

function parseTransports(raw: unknown): AuthenticatorTransportFuture[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: AuthenticatorTransportFuture[] = [];
  for (const item of list) {
    const t = String(item ?? "").trim();
    if (TRANSPORTS.has(t)) out.push(t as AuthenticatorTransportFuture);
  }
  return out.length > 0 ? out : ["internal"];
}

function mapCredentialRow(row: {
  id: string;
  owner_id: string;
  employee_id: string;
  credential_id: string;
  public_key: string;
  device_label: string | null;
  device_id: string | null;
  sign_count: number | string;
  transports: unknown;
  webauthn_user_id: string | null;
  aaguid: string | null;
}): StoredWebAuthnCredential {
  return {
    id: row.id,
    ownerId: row.owner_id,
    employeeId: row.employee_id,
    credentialId: row.credential_id,
    publicKey: row.public_key,
    deviceLabel: row.device_label ?? "",
    deviceId: row.device_id,
    signCount: Number(row.sign_count) || 0,
    transports: parseTransports(row.transports),
    webauthnUserId: row.webauthn_user_id,
    aaguid: row.aaguid,
  };
}

async function purgeExpiredChallenges(
  admin: SupabaseClient,
  employeeId: string,
  ceremony: "register" | "authenticate"
): Promise<void> {
  const now = new Date().toISOString();
  await admin
    .from("visitor_employee_webauthn_challenges")
    .delete()
    .eq("employee_id", employeeId)
    .eq("ceremony", ceremony)
    .lt("expires_at", now);
}

async function saveChallenge(
  admin: SupabaseClient,
  ownerId: string,
  employeeId: string,
  ceremony: "register" | "authenticate",
  challenge: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  await purgeExpiredChallenges(admin, employeeId, ceremony);
  await admin
    .from("visitor_employee_webauthn_challenges")
    .delete()
    .eq("employee_id", employeeId)
    .eq("ceremony", ceremony);

  const { error } = await admin.from("visitor_employee_webauthn_challenges").insert({
    owner_id: ownerId,
    employee_id: employeeId,
    ceremony,
    challenge,
    expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  });

  if (error) {
    if (isMissingWebAuthnOrBiometricTable(error)) {
      return { ok: false, error: BIOMETRIC_SETUP_MESSAGE, status: 503 };
    }
    return { ok: false, error: error.message, status: 500 };
  }
  return { ok: true };
}

async function consumeChallenge(
  admin: SupabaseClient,
  employeeId: string,
  ceremony: "register" | "authenticate"
): Promise<{ ok: true; challenge: string } | { ok: false; error: string; status: number }> {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("visitor_employee_webauthn_challenges")
    .select("id,challenge,expires_at")
    .eq("employee_id", employeeId)
    .eq("ceremony", ceremony)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingWebAuthnOrBiometricTable(error)) {
      return { ok: false, error: BIOMETRIC_SETUP_MESSAGE, status: 503 };
    }
    return { ok: false, error: error.message, status: 500 };
  }
  if (!data?.challenge) {
    return { ok: false, error: "Fingerprint challenge expired. Try again.", status: 400 };
  }

  await admin.from("visitor_employee_webauthn_challenges").delete().eq("id", data.id);
  return { ok: true, challenge: String(data.challenge) };
}

export async function listActiveWebAuthnCredentials(
  admin: SupabaseClient,
  ownerId: string,
  employeeId: string
): Promise<
  | { ok: true; credentials: StoredWebAuthnCredential[] }
  | { ok: false; error: string; status: number }
> {
  const { data, error } = await admin
    .from("visitor_employee_webauthn_credentials")
    .select(CREDENTIAL_SELECT)
    .eq("owner_id", ownerId)
    .eq("employee_id", employeeId)
    .eq("status", "active");

  if (error) {
    if (isMissingWebAuthnOrBiometricTable(error)) {
      return { ok: false, error: BIOMETRIC_SETUP_MESSAGE, status: 503 };
    }
    return { ok: false, error: error.message, status: 500 };
  }
  return { ok: true, credentials: (data ?? []).map(mapCredentialRow) };
}

export async function revokeWebAuthnCredentialsForEmployee(
  admin: SupabaseClient,
  ownerId: string,
  employeeId: string
): Promise<void> {
  const now = new Date().toISOString();
  await admin
    .from("visitor_employee_webauthn_credentials")
    .update({ status: "revoked", revoked_at: now })
    .eq("owner_id", ownerId)
    .eq("employee_id", employeeId)
    .eq("status", "active");
}

export async function generateEmployeeRegistrationOptions(
  admin: SupabaseClient,
  rp: WebAuthnRpConfig,
  input: {
    ownerId: string;
    employeeId: string;
    memberCode: string;
    displayName: string;
  }
): Promise<
  | { ok: true; options: PublicKeyCredentialCreationOptionsJSON }
  | { ok: false; error: string; status: number }
> {
  const existing = await listActiveWebAuthnCredentials(admin, input.ownerId, input.employeeId);
  if (!existing.ok) return existing;

  const userID = new TextEncoder().encode(input.employeeId).slice(0, 64);
  const options = await generateRegistrationOptions({
    rpName: rp.rpName,
    rpID: rp.rpID,
    userName: (input.memberCode || input.employeeId).slice(0, 64),
    userDisplayName: (input.displayName || input.memberCode || "Employee").slice(0, 64),
    userID,
    timeout: 90_000,
    attestationType: "none",
    supportedAlgorithmIDs: [-7, -257],
    excludeCredentials: existing.credentials.map((c) => ({
      id: c.credentialId,
      transports: c.transports,
    })),
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "discouraged",
      requireResidentKey: false,
      userVerification: "discouraged",
    },
    preferredAuthenticatorType: "localDevice",
  });

  const saved = await saveChallenge(
    admin,
    input.ownerId,
    input.employeeId,
    "register",
    options.challenge
  );
  if (!saved.ok) return saved;
  return { ok: true, options };
}

export async function verifyEmployeeRegistration(
  admin: SupabaseClient,
  rp: WebAuthnRpConfig,
  input: {
    ownerId: string;
    employeeId: string;
    enrolledBy: string;
    response: RegistrationResponseJSON;
    deviceLabel?: string;
    deviceId?: string | null;
  }
): Promise<
  | { ok: true; credentialId: string; employeeName: string }
  | { ok: false; error: string; status: number }
> {
  const challenge = await consumeChallenge(admin, input.employeeId, "register");
  if (!challenge.ok) return challenge;

  let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  try {
    verification = await verifyRegistrationResponse({
      response: input.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: rp.expectedOrigin,
      expectedRPID: rp.rpID,
      requireUserVerification: false,
    });
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not verify fingerprint registration.",
      status: 400,
    };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, error: "Fingerprint registration could not be verified.", status: 400 };
  }

  const { credential, aaguid } = verification.registrationInfo;
  const now = new Date().toISOString();
  const deviceLabel = (input.deviceLabel ?? "").trim().slice(0, 200) || "Reception kiosk";
  const transports = parseTransports(credential.transports);

  const { error: insertErr } = await admin.from("visitor_employee_webauthn_credentials").insert({
    owner_id: input.ownerId,
    employee_id: input.employeeId,
    credential_id: credential.id,
    public_key: uint8ToBase64Url(credential.publicKey),
    device_label: deviceLabel,
    device_id: input.deviceId ?? null,
    sign_count: credential.counter ?? 0,
    transports,
    webauthn_user_id: input.employeeId,
    aaguid: aaguid || null,
    status: "active",
    created_at: now,
  });

  if (insertErr) {
    if (isMissingWebAuthnOrBiometricTable(insertErr)) {
      return { ok: false, error: BIOMETRIC_SETUP_MESSAGE, status: 503 };
    }
    if (insertErr.message.toLowerCase().includes("duplicate") || insertErr.code === "23505") {
      return { ok: false, error: "This fingerprint credential is already registered.", status: 409 };
    }
    return { ok: false, error: insertErr.message, status: 500 };
  }

  const enrolled = await ensureWebAuthnEnrollment(admin, {
    ownerId: input.ownerId,
    employeeId: input.employeeId,
    enrolledBy: input.enrolledBy,
    credentialId: credential.id,
  });
  if (!enrolled.ok) return enrolled;

  return { ok: true, credentialId: credential.id, employeeName: enrolled.employeeName };
}

async function ensureWebAuthnEnrollment(
  admin: SupabaseClient,
  input: { ownerId: string; employeeId: string; enrolledBy: string; credentialId: string }
): Promise<{ ok: true; employeeName: string } | { ok: false; error: string; status: number }> {
  const { data: employee, error: empErr } = await admin
    .from("visitor_employees")
    .select("id,full_name,status")
    .eq("id", input.employeeId)
    .eq("owner_id", input.ownerId)
    .maybeSingle();

  if (empErr) return { ok: false, error: empErr.message, status: 500 };
  if (!employee) return { ok: false, error: "Employee not found.", status: 404 };
  if (String(employee.status) !== "active") {
    return { ok: false, error: "Only active employees can be enrolled.", status: 400 };
  }

  const employeeName = String(employee.full_name ?? "");
  const { data: existing } = await admin
    .from("visitor_employee_biometric_enrollments")
    .select("id")
    .eq("employee_id", input.employeeId)
    .eq("finger_index", DEFAULT_BIOMETRIC_FINGER_INDEX)
    .eq("status", "active")
    .maybeSingle();

  const now = new Date().toISOString();
  if (existing?.id) {
    await admin
      .from("visitor_employee_biometric_enrollments")
      .update({
        vendor: "webauthn",
        external_id: input.credentialId,
        updated_at: now,
      })
      .eq("id", existing.id);
    return { ok: true, employeeName };
  }

  const { salt, hash } = createBiometricTemplateMaterial();
  const { error: insertErr } = await admin.from("visitor_employee_biometric_enrollments").insert({
    owner_id: input.ownerId,
    employee_id: input.employeeId,
    finger_index: DEFAULT_BIOMETRIC_FINGER_INDEX,
    finger_label: fingerLabelForIndex(DEFAULT_BIOMETRIC_FINGER_INDEX),
    template_hash: hash,
    template_salt: salt,
    status: "active",
    vendor: "webauthn",
    external_id: input.credentialId,
    enrolled_by: input.enrolledBy,
    enrolled_at: now,
    created_at: now,
    updated_at: now,
  });

  if (insertErr) {
    if (isMissingWebAuthnOrBiometricTable(insertErr)) {
      return { ok: false, error: BIOMETRIC_SETUP_MESSAGE, status: 503 };
    }
    return { ok: false, error: insertErr.message, status: 500 };
  }
  return { ok: true, employeeName };
}

export async function generateEmployeeAuthenticationOptions(
  admin: SupabaseClient,
  rp: WebAuthnRpConfig,
  input: { ownerId: string; employeeId: string }
): Promise<
  | { ok: true; options: PublicKeyCredentialRequestOptionsJSON }
  | { ok: false; error: string; status: number }
> {
  const existing = await listActiveWebAuthnCredentials(admin, input.ownerId, input.employeeId);
  if (!existing.ok) return existing;
  if (existing.credentials.length === 0) {
    return { ok: false, error: BIOMETRIC_NOT_REGISTERED_MESSAGE, status: 404 };
  }

  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    timeout: 90_000,
    userVerification: "discouraged",
    allowCredentials: existing.credentials.map((c) => ({
      id: c.credentialId,
      transports: c.transports,
    })),
  });

  const saved = await saveChallenge(
    admin,
    input.ownerId,
    input.employeeId,
    "authenticate",
    options.challenge
  );
  if (!saved.ok) return saved;
  return { ok: true, options };
}

export async function verifyEmployeeAuthentication(
  admin: SupabaseClient,
  rp: WebAuthnRpConfig,
  input: {
    ownerId: string;
    employeeId: string;
    response: AuthenticationResponseJSON;
  }
): Promise<
  | { ok: true; credential: StoredWebAuthnCredential }
  | { ok: false; error: string; status: number }
> {
  const challenge = await consumeChallenge(admin, input.employeeId, "authenticate");
  if (!challenge.ok) return challenge;

  const existing = await listActiveWebAuthnCredentials(admin, input.ownerId, input.employeeId);
  if (!existing.ok) return existing;

  const assertionId = String(input.response.id ?? "").trim();
  const stored = existing.credentials.find((c) => c.credentialId === assertionId);
  if (!stored) {
    return { ok: false, error: BIOMETRIC_NOT_REGISTERED_MESSAGE, status: 404 };
  }

  let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
  try {
    verification = await verifyAuthenticationResponse({
      response: input.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: rp.expectedOrigin,
      expectedRPID: rp.rpID,
      requireUserVerification: false,
      credential: {
        id: stored.credentialId,
        publicKey: base64UrlToUint8(stored.publicKey).slice(),
        counter: stored.signCount,
        transports: stored.transports,
      },
    });
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not verify fingerprint.",
      status: 400,
    };
  }

  if (!verification.verified) {
    return { ok: false, error: "Fingerprint was not recognised.", status: 401 };
  }

  const now = new Date().toISOString();
  const newCounter = verification.authenticationInfo.newCounter;
  await admin
    .from("visitor_employee_webauthn_credentials")
    .update({
      sign_count: newCounter,
      last_used_at: now,
    })
    .eq("id", stored.id);

  await admin
    .from("visitor_employee_biometric_enrollments")
    .update({ last_matched_at: now, updated_at: now })
    .eq("employee_id", input.employeeId)
    .eq("status", "active")
    .eq("external_id", stored.credentialId);

  return { ok: true, credential: { ...stored, signCount: newCounter } };
}

export function parseWebAuthnJsonBody(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

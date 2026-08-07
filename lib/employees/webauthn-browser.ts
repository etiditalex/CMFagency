/** Browser helpers for platform fingerprint on the shared biometric terminal.
 * Uses userVerification "discouraged" so the OS should not fall back to
 * screen password / PIN — fingerprint (or Face ID) only.
 */

import { BIOMETRIC_NOT_REGISTERED_MESSAGE } from "@/lib/employees/biometric";

export const BIOMETRIC_WEBAUTHN_CREDS_KEY = "fx_employee_biometric_webauthn_creds";

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function randomChallenge(): BufferSource {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function isPlatformWebAuthnAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.PublicKeyCredential !== "undefined";
}

export function listLocalWebAuthnCredentialIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BIOMETRIC_WEBAUTHN_CREDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => String(v ?? "").trim())
      .filter((v) => v.length >= 16)
      .slice(0, 200);
  } catch {
    return [];
  }
}

export function rememberLocalWebAuthnCredentialId(credentialId: string): void {
  if (typeof window === "undefined") return;
  const id = credentialId.trim();
  if (id.length < 16) return;
  try {
    const next = Array.from(new Set([id, ...listLocalWebAuthnCredentialIds()])).slice(0, 200);
    window.localStorage.setItem(BIOMETRIC_WEBAUTHN_CREDS_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

function uvErrorMessage(err: unknown, kind: "register" | "scan"): string {
  const name = err instanceof DOMException ? err.name : "";
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (name === "NotAllowedError" || /not allowed|cancel|abort/i.test(msg)) {
    return kind === "register"
      ? "Fingerprint registration was cancelled. Use the fingerprint sensor (not screen password), then try again."
      : "Fingerprint scan was cancelled. Use the fingerprint sensor only — do not enter the phone or screen password.";
  }
  if (/password|pin|passcode|screen lock/i.test(msg)) {
    return "This terminal uses fingerprint only. Dismiss the password prompt and use the fingerprint sensor, or re-register with fingerprint on this device.";
  }
  return err instanceof Error ? err.message : kind === "register"
    ? "Could not register fingerprint."
    : "Could not read fingerprint.";
}

export async function createEmployeeWebAuthnCredential(input: {
  employeeId: string;
  memberCode: string;
  displayName: string;
}): Promise<string> {
  if (!isPlatformWebAuthnAvailable()) {
    throw new Error(
      "This device does not support fingerprint sign-in. Use a tablet or phone with a fingerprint sensor."
    );
  }

  const userId = new TextEncoder().encode(input.employeeId).slice(0, 64);
  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: randomChallenge(),
        rp: {
          name: "Fusion Xpress Attendance",
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: input.memberCode.slice(0, 64) || input.employeeId,
          displayName: input.displayName.slice(0, 64) || input.memberCode || "Employee",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          // Avoid discoverable+required UV — that often forces PIN/password on phones.
          residentKey: "discouraged",
          requireResidentKey: false,
          userVerification: "discouraged",
        },
        timeout: 90_000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error("Fingerprint registration was cancelled. Use the fingerprint sensor, not a password.");
    }

    const credentialId = toBase64Url(credential.rawId);
    rememberLocalWebAuthnCredentialId(credentialId);
    return credentialId;
  } catch (e: unknown) {
    throw new Error(uvErrorMessage(e, "register"));
  }
}

export async function assertEmployeeWebAuthnCredential(): Promise<string> {
  if (!isPlatformWebAuthnAvailable()) {
    throw new Error(
      "This device does not support fingerprint sign-in. Use a tablet or phone with a fingerprint sensor."
    );
  }

  const localIds = listLocalWebAuthnCredentialIds();
  if (localIds.length === 0) {
    throw new Error(BIOMETRIC_NOT_REGISTERED_MESSAGE);
  }

  const allowCredentials: PublicKeyCredentialDescriptor[] = localIds.map((id) => ({
    type: "public-key",
    id: fromBase64Url(id),
    transports: ["internal"],
  }));

  try {
    const credential = (await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge(),
        rpId: window.location.hostname,
        timeout: 90_000,
        // Fingerprint only — do not require screen password / PIN.
        userVerification: "discouraged",
        allowCredentials,
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error("Fingerprint scan was cancelled. Use the fingerprint sensor only.");
    }

    const credentialId = toBase64Url(credential.rawId);
    rememberLocalWebAuthnCredentialId(credentialId);
    return credentialId;
  } catch (e: unknown) {
    throw new Error(uvErrorMessage(e, "scan"));
  }
}

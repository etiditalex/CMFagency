/** Browser helpers for platform fingerprint on the shared biometric terminal. */

import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

export function isPlatformWebAuthnAvailable(): boolean {
  return browserSupportsWebAuthn();
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
  return err instanceof Error
    ? err.message
    : kind === "register"
      ? "Could not register fingerprint."
      : "Could not read fingerprint.";
}

export async function registerEmployeeWebAuthn(
  optionsJSON: PublicKeyCredentialCreationOptionsJSON
): Promise<RegistrationResponseJSON> {
  if (!isPlatformWebAuthnAvailable()) {
    throw new Error(
      "This device does not support fingerprint sign-in. Use a tablet or phone with a fingerprint sensor."
    );
  }
  try {
    return await startRegistration({ optionsJSON });
  } catch (e: unknown) {
    throw new Error(uvErrorMessage(e, "register"));
  }
}

export async function authenticateEmployeeWebAuthn(
  optionsJSON: PublicKeyCredentialRequestOptionsJSON
): Promise<AuthenticationResponseJSON> {
  if (!isPlatformWebAuthnAvailable()) {
    throw new Error(
      "This device does not support fingerprint sign-in. Use a tablet or phone with a fingerprint sensor."
    );
  }
  try {
    return await startAuthentication({ optionsJSON });
  } catch (e: unknown) {
    throw new Error(uvErrorMessage(e, "scan"));
  }
}

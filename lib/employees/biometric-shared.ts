/** The only finger this module records. */
export const RIGHT_THUMB = "right_thumb" as const;

export type BiometricAttachment = "platform" | "cross-platform";

export function isBiometricAttachment(value: unknown): value is BiometricAttachment {
  return value === "platform" || value === "cross-platform";
}

/**
 * Phones and computers with an operating-system fingerprint use that sensor.
 * An external reader is used when this device has no platform sensor, or when
 * the employee explicitly chooses the reader.
 */
export function chooseBiometricAttachment(input: {
  platformAvailable: boolean;
  platformEnrolled: boolean;
  readerEnrolled: boolean;
  prefer?: BiometricAttachment | null;
}): BiometricAttachment {
  if (input.prefer === "platform" || input.prefer === "cross-platform") return input.prefer;
  if (input.platformAvailable && input.platformEnrolled) return "platform";
  if (input.readerEnrolled && !input.platformAvailable) return "cross-platform";
  if (input.platformAvailable) return "platform";
  return "cross-platform";
}

export function biometricBrowserError(err: unknown): string {
  const name = err instanceof DOMException || err instanceof Error ? err.name : "";
  if (name === "NotAllowedError" || name === "AbortError") {
    return "The fingerprint prompt was closed. Tap Scan right thumb and place your right thumb on the sensor.";
  }
  if (name === "InvalidStateError") {
    return "This right thumb is already recorded on this device. Scan it to sign in or out.";
  }
  if (name === "NotSupportedError") {
    return "This browser cannot find a fingerprint sensor. Open the link in the phone's browser, or attach a fingerprint reader.";
  }
  if (name === "SecurityError") {
    return "Fingerprint sign-in needs a secure page. Open the https link from your manager.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "The fingerprint scan could not be completed.";
}

export const BIOMETRIC_SETUP_MESSAGE =
  "Run database/visitor_employees_patch_19_biometric.sql in the Supabase SQL Editor. Then open Project Settings → API and click “Reload schema” if the error persists.";

/** Keep digits only so +254 712 345 678, 0712345678, and 712345678 match. */
export function visitorPhoneDigits(raw: string | null | undefined): string {
  return String(raw ?? "").replace(/\D/g, "");
}

/**
 * Compare Kenyan (and similar) mobile numbers by the last 9 digits.
 * Falls back to full digit string when shorter.
 */
export function normalizeVisitorPhone(raw: string | null | undefined): string {
  const digits = visitorPhoneDigits(raw);
  if (!digits) return "";
  if (digits.startsWith("254") && digits.length >= 12) return digits.slice(-9);
  if (digits.startsWith("0") && digits.length >= 10) return digits.slice(-9);
  if (digits.length >= 9) return digits.slice(-9);
  return digits;
}

export function visitorPhonesMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const left = normalizeVisitorPhone(a);
  const right = normalizeVisitorPhone(b);
  return Boolean(left) && left === right;
}

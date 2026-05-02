/**
 * Referral fields store the referrer's display name only (not phone numbers).
 * Returns an error message when invalid, or null when empty or OK.
 */
export function validateReferredByNameOnly(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  const compact = t.replace(/\s/g, "");
  let msisdn = compact;
  if (compact.startsWith("+254")) msisdn = `254${compact.slice(4)}`;
  else if (compact.startsWith("254")) msisdn = compact;
  else if (compact.startsWith("0") && compact.length >= 10) msisdn = `254${compact.slice(1)}`;
  else if (compact.length === 9 && /^[17]/.test(compact)) msisdn = `254${compact}`;

  if (/^254[17]\d{8}$/.test(msisdn)) {
    return "Referred by must be the referrer's name, not a phone number.";
  }
  if (!/\p{L}/u.test(t)) {
    return "Referred by must be a name.";
  }
  return null;
}

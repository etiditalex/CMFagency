/** Normalize to Kenya 254XXXXXXXXX for M-Pesa / stored MSISDN. */
export function normalizeKenyaPhone(raw: string): string {
  const phoneRaw = raw.trim().replace(/\s/g, "");
  if (phoneRaw.startsWith("+254")) return `254${phoneRaw.slice(4)}`;
  if (phoneRaw.startsWith("254")) return phoneRaw;
  if (phoneRaw.startsWith("0") && phoneRaw.length >= 10) return `254${phoneRaw.slice(1)}`;
  if (phoneRaw.length === 9 && /^[17]/.test(phoneRaw)) return `254${phoneRaw}`;
  return phoneRaw;
}

export function isValidKenyaPhone(msisdn: string): boolean {
  return /^254[17]\d{8}$/.test(msisdn);
}

/** Optional phone: empty is OK; non-empty must be a valid Kenya MSISDN. */
export function parseOptionalKenyaPhone(raw: string): { phone: string | null; error: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { phone: null, error: null };
  const norm = normalizeKenyaPhone(trimmed);
  if (!isValidKenyaPhone(norm)) {
    return {
      phone: null,
      error: "Enter a valid Kenya phone number (e.g. 0712345678 or 254712345678).",
    };
  }
  return { phone: norm, error: null };
}

/** Required phone: must be present and a valid Kenya MSISDN. */
export function parseRequiredKenyaPhone(raw: string): { phone: string | null; error: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { phone: null, error: "Referrer phone number is required." };
  }
  return parseOptionalKenyaPhone(trimmed);
}

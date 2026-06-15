/** Appended to leave `notes` after human-readable text. */
export const LEAVE_SIGNATURE_MARKER = "\n---SIGNATURE---\n";

const SIGNATURE_DATA_PREFIX = "data:image/png;base64,";
const MAX_SIGNATURE_DATA_URL_LENGTH = 220_000;

export function validateLeaveSignatureDataUrl(value: string | null | undefined): boolean {
  const url = String(value ?? "").trim();
  if (!url.startsWith(SIGNATURE_DATA_PREFIX)) return false;
  const payload = url.slice(SIGNATURE_DATA_PREFIX.length);
  if (payload.length < 80 || payload.length > MAX_SIGNATURE_DATA_URL_LENGTH) return false;
  return /^[A-Za-z0-9+/=]+$/.test(payload);
}

export function parseLeaveApplicationNotes(notes: string): {
  text: string;
  signatureDataUrl: string | null;
} {
  const raw = notes.trim();
  if (!raw) return { text: "", signatureDataUrl: null };
  const idx = raw.indexOf(LEAVE_SIGNATURE_MARKER);
  if (idx === -1) return { text: raw, signatureDataUrl: null };
  const text = raw.slice(0, idx).trim();
  const signatureDataUrl = raw.slice(idx + LEAVE_SIGNATURE_MARKER.length).trim() || null;
  if (signatureDataUrl && !validateLeaveSignatureDataUrl(signatureDataUrl)) {
    return { text: raw, signatureDataUrl: null };
  }
  return { text, signatureDataUrl };
}

export function appendLeaveSignatureToNotes(notesBody: string, signatureDataUrl: string): string {
  return `${notesBody.trim()}${LEAVE_SIGNATURE_MARKER}${signatureDataUrl}`;
}

/** Built-in demo accounts with full Professional + Enterprise visitor features (no payment). */
export const VISITOR_DEMO_ACCOUNT_EMAILS: readonly string[] = ["inukamedia06@gmail.com"];

export function normalizeVisitorAccountEmail(email: string | null | undefined): string {
  return String(email ?? "").trim().toLowerCase();
}

function demoEmailsFromEnv(): string[] {
  const raw = process.env.VISITOR_DEMO_ACCOUNT_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => normalizeVisitorAccountEmail(e))
    .filter(Boolean);
}

export function isVisitorDemoAccount(email: string | null | undefined): boolean {
  const normalized = normalizeVisitorAccountEmail(email);
  if (!normalized) return false;
  if (VISITOR_DEMO_ACCOUNT_EMAILS.includes(normalized)) return true;
  return demoEmailsFromEnv().includes(normalized);
}

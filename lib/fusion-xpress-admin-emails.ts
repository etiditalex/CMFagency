export function parseFusionXpressAdminEmails(): string[] {
  return String(process.env.FUSION_XPRESS_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes("@"));
}

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
// IMPORTANT: To send to any recipient (not just your Resend account email), you must:
// 1. Verify a domain at https://resend.com/domains
// 2. Set RESEND_FROM_EMAIL to an address on that domain, e.g. "CMF Agency <noreply@yourdomain.com>"
// If unset, Resend only allows sending to your own account email (testing mode).
const fromEmail = process.env.RESEND_FROM_EMAIL || "CMF Agency <onboarding@resend.dev>";

export const resend = resendApiKey ? new Resend(resendApiKey) : null;
export { fromEmail };

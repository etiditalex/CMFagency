import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || "CMF Agency <noreply@resend.dev>";

export const resend = resendApiKey ? new Resend(resendApiKey) : null;
export { fromEmail };

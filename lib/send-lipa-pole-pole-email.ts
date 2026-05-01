import { resend, fromEmail } from "@/lib/resend";
import { LipaPolePoleEmail } from "@/components/emails/lipa-pole-pole-email";

export async function sendLipaPolePoleEmail(params: {
  to: string;
  holderName: string;
  campaignTitle: string;
  totalDueKes: number;
  paidKes: number;
  balanceKes: number;
  continueUrl: string;
  variant: "reminder" | "partial_paid";
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) return { ok: false, error: "RESEND_API_KEY not configured" };
  const subject =
    params.variant === "reminder"
      ? `Lipa Pole Pole — KES ${params.balanceKes.toLocaleString()} remaining`
      : params.balanceKes > 0
        ? `Lipa Pole Pole — payment received (KES ${params.balanceKes.toLocaleString()} left)`
        : `Lipa Pole Pole — payment complete`;

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [params.to],
      subject,
      react: LipaPolePoleEmail({
        holderName: params.holderName,
        campaignTitle: params.campaignTitle,
        totalDueKes: params.totalDueKes,
        paidKes: params.paidKes,
        balanceKes: params.balanceKes,
        continueUrl: params.continueUrl,
        variant: params.variant,
      }),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

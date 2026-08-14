import { fromEmail } from "@/lib/resend";
import { buildResendEmailHeaderHtml } from "@/lib/resend-email-header";
import type { VotingResultsSnapshot } from "@/lib/voting-results-data";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nairobiStamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export async function sendVotingResultsEmail(params: {
  to: string;
  snapshot: VotingResultsSnapshot;
  winnersPdf: { filename: string; bytes: Uint8Array };
  contestantsPdf: { filename: string; bytes: Uint8Array };
}): Promise<{ ok: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) return { ok: false, error: "RESEND_API_KEY not configured" };

  const to = params.to.trim().toLowerCase();
  if (!to.includes("@")) return { ok: false, error: "Invalid admin email" };

  const winnerCount = params.snapshot.categories.filter((c) => c.winners.length > 0).length;
  const undeclared = params.snapshot.categories.length - winnerCount;
  const stamp = escapeHtml(nairobiStamp(params.snapshot.generatedAtIso));

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto; padding: 20px;">
${buildResendEmailHeaderHtml({ subtitle: "Coast Fashion Awards 2026 · Official voting results" })}
<div style="background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px; text-align: left;">
<p style="margin: 0 0 16px; font-size: 16px;"><strong>Voting has closed.</strong> Official PDFs are attached.</p>
<p style="margin: 0 0 16px;">Results were compiled at <strong>${stamp} EAT</strong> from paid votes in every active category.</p>
<ul style="margin: 0 0 20px; padding-left: 20px;">
<li><strong>Categories:</strong> ${params.snapshot.categoryCount}</li>
<li><strong>Contestants:</strong> ${params.snapshot.contestantCount}</li>
<li><strong>Total votes:</strong> ${params.snapshot.totalVotes.toLocaleString("en-KE")}</li>
<li><strong>Categories with a winner:</strong> ${winnerCount}${undeclared > 0 ? ` (${undeclared} with no votes)` : ""}</li>
</ul>
<p style="margin: 0 0 16px; padding: 14px; background: #faf6e8; border-radius: 8px; border: 1px solid #d4af37;">
<strong>Two PDFs attached</strong><br>
1. Gold category winners booklet (circled contestant photo where available)<br>
2. Full list of every contestant who participated in voting, ranked by votes
</p>
<p style="margin: 24px 0 0; font-size: 12px; color: #6b7280;">
This email is sent automatically at midnight East Africa Time when voting closes. CMF Agency · Changer Fusions
</p>
</div>
</body>
</html>`;

  const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: `CFMA 2026 official voting results — ${params.snapshot.categoryCount} category winners`,
        html,
        attachments: [
          { filename: params.winnersPdf.filename, content: toBase64(params.winnersPdf.bytes) },
          { filename: params.contestantsPdf.filename, content: toBase64(params.contestantsPdf.bytes) },
        ],
      }),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { message?: string };
      return { ok: false, error: errBody.message ?? `Resend HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send results email" };
  }
}

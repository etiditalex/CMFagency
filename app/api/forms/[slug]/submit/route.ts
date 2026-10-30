import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  isPlausibleFormEmail,
  isPlausibleFormPhone,
  makeFormSubmissionCode,
  parseFormFields,
  type FusionFormField,
  type StoredFormAnswer,
} from "@/lib/fusion-forms";
import { checkFormSubmitRateLimit, getClientIp } from "@/lib/rate-limit";
import { fromEmail, resend } from "@/lib/resend";
import { escapeHtml, sanitizeText } from "@/lib/sanitize";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

function answerValue(field: FusionFormField, raw: string): { ok: true; value: string } | { ok: false; error: string } {
  if (field.type === "checkbox") {
    const yes = raw === "yes" || raw === "true" || raw === "on";
    if (field.required && !yes) return { ok: false, error: `${field.label} is required.` };
    return { ok: true, value: yes ? "Yes" : "No" };
  }
  if (field.required && !raw) return { ok: false, error: `${field.label} is required.` };
  if (field.type === "email" && raw && !isPlausibleFormEmail(raw)) {
    return { ok: false, error: `Enter a valid email for ${field.label}.` };
  }
  if (field.type === "phone" && raw && !isPlausibleFormPhone(raw)) {
    return { ok: false, error: `Enter a valid phone number for ${field.label}.` };
  }
  if (field.type === "select" && raw && !field.options.includes(raw)) {
    return { ok: false, error: `Choose a valid option for ${field.label}.` };
  }
  if (field.type === "select" && field.required && !field.options.includes(raw)) {
    return { ok: false, error: `${field.label} is required.` };
  }
  return { ok: true, value: raw };
}

async function emailReceipt(to: string, name: string, title: string, code: string) {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `We received your ${title} form`,
      html: `<p>Hello ${escapeHtml(name || "there")},</p>
<p>Your response to <strong>${escapeHtml(title)}</strong> has been received.</p>
<p><strong>Reference:</strong> ${escapeHtml(code)}</p>
<p>Changer Fusions will contact you using the details you provided if a reply is needed.</p>`,
    });
    return !error;
  } catch (error) {
    console.error("fusion form email:", error);
    return false;
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfter } = checkFormSubmitRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many submissions from this network. Try again later.", retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter ?? 3600) } }
      );
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Forms are not available right now." }, { status: 503 });
    }

    const { slug } = await context.params;
    const body = (await request.json().catch(() => null)) as { answers?: unknown } | null;
    const incoming = body?.answers;
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
      return NextResponse.json({ error: "Invalid form response." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("fusion_forms")
      .select("id, title, fields, published_at")
      .eq("slug", slug)
      .not("published_at", "is", null)
      .maybeSingle();
    if (error) {
      console.error("fusion form load:", error.message);
      return NextResponse.json({ error: "Could not open this form." }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "This form is not available." }, { status: 404 });

    const fields = parseFormFields(data.fields);
    if (fields.length === 0) {
      return NextResponse.json({ error: "This form is not open for responses." }, { status: 400 });
    }

    const answers: StoredFormAnswer[] = [];
    const rawAnswers = incoming as Record<string, unknown>;
    for (const field of fields) {
      const raw = sanitizeText(rawAnswers[field.id]);
      const checked = answerValue(field, raw);
      if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
      answers.push({ id: field.id, label: field.label, value: checked.value });
    }

    const nameField = fields.find((field) => field.type === "text" && /name/i.test(field.label)) ?? fields.find((field) => field.type === "text");
    const emailField = fields.find((field) => field.type === "email");
    const submitterName = nameField ? answers.find((answer) => answer.id === nameField.id)?.value || null : null;
    const submitterEmail = emailField
      ? (answers.find((answer) => answer.id === emailField.id)?.value || "").toLowerCase() || null
      : null;

    let submissionCode = "";
    let inserted = false;
    for (let attempt = 0; attempt < 3 && !inserted; attempt += 1) {
      submissionCode = makeFormSubmissionCode();
      const { error: insertError } = await supabaseAdmin.from("fusion_form_submissions").insert({
        form_id: data.id,
        submission_code: submissionCode,
        submitter_name: submitterName,
        submitter_email: submitterEmail,
        answers,
        status: "new",
      });
      if (!insertError) {
        inserted = true;
        break;
      }
      if (!insertError.message.includes("submission_code") && !insertError.message.includes("duplicate")) {
        console.error("fusion form insert:", insertError.message);
        const missing = insertError.message.includes("does not exist") || insertError.message.includes("42P01");
        return NextResponse.json(
          { error: missing ? "Forms are not set up yet." : "Could not save this response." },
          { status: missing ? 503 : 500 }
        );
      }
    }
    if (!inserted) return NextResponse.json({ error: "Could not save this response." }, { status: 500 });

    const emailed =
      submitterEmail && isPlausibleFormEmail(submitterEmail)
        ? await emailReceipt(submitterEmail, submitterName || "", String(data.title || "form"), submissionCode)
        : false;

    return NextResponse.json({ ok: true, submissionCode, emailed });
  } catch (error) {
    console.error("fusion form submit:", error);
    return NextResponse.json({ error: "Could not submit this form." }, { status: 500 });
  }
}

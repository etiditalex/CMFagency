import { NextRequest, NextResponse } from "next/server";

import { mapVisitorRow, isMissingVisitorsTable, type VisitorRow } from "@/lib/visitors/db-mapper";
import { getIndustryDemo } from "@/lib/visitors/industry-demos";
import { industryLabel } from "@/lib/visitors/industry-options";
import { mapIndustryFormToVisitor } from "@/lib/visitors/industry-form-mapper";
import { formatCheckInClock, formatCheckInDateLabel } from "@/lib/visitors/format-check-in-display";
import { resolveCheckInOwner } from "@/lib/visitors/resolve-check-in-owner";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";
import { sendVisitorCheckInConfirmationEmail } from "@/lib/visitors/send-visitor-checkin-email";

function safeText(v: unknown, max: number) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  return s.slice(0, max);
}

function pickEmail(values: Record<string, unknown>): string | null {
  const email = safeText(values.email, 200);
  return email && email.includes("@") ? email : null;
}

/** Public industry form check-in — creates a live visitor record for the business owner. */
export async function POST(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const industrySlug = safeText(body.industrySlug ?? body.industry_slug, 80);
    const ownerId = safeText(body.ownerId ?? body.owner_id, 80);

    if (!industrySlug || !getIndustryDemo(industrySlug)) {
      return NextResponse.json({ error: "Invalid industry" }, { status: 400 });
    }
    if (!ownerId) {
      return NextResponse.json(
        {
          error:
            "This check-in form requires a valid business link. Ask your host for their Fusion Xpress check-in URL.",
        },
        { status: 400 }
      );
    }

    const owner = await resolveCheckInOwner(admin, ownerId);
    if ("error" in owner) {
      return NextResponse.json({ error: owner.error }, { status: 400 });
    }

    const values =
      body.values && typeof body.values === "object" && !Array.isArray(body.values)
        ? (body.values as Record<string, unknown>)
        : body;

    const mapped = mapIndustryFormToVisitor(industrySlug, values);
    if ("error" in mapped) {
      return NextResponse.json({ error: mapped.error }, { status: 400 });
    }

    const sendEmail =
      body.sendConfirmationEmail === true && pickEmail(values) !== null;

    const row = {
      owner_id: owner.ownerId,
      ...mapped.row,
      status: "checked_in",
      source: "demo_form",
    };

    const { data, error } = await admin.from("visitors").insert(row).select().single();
    if (error) {
      if (isMissingVisitorsTable(error)) {
        return NextResponse.json(
          {
            error: "Visitor tables not set up. Run database/visitor_management_patch_01.sql in Supabase.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const visitor = mapVisitorRow(data as VisitorRow);
    const checkedInAt =
      (data as VisitorRow).checked_in_at ?? new Date().toISOString();

    const guestEmail = pickEmail(values);
    let emailSent = false;
    if (sendEmail && guestEmail) {
      const emailResult = await sendVisitorCheckInConfirmationEmail({
        to: guestEmail,
        visitorName: visitor.fullName,
        venueName: owner.venueName,
        checkedInAt,
        industryLabel: industryLabel(industrySlug),
      });
      emailSent = emailResult.ok === true;
    }

    return NextResponse.json({
      ok: true,
      visitor,
      checkIn: {
        visitorId: visitor.id,
        venueName: owner.venueName,
        visitorName: visitor.fullName,
        checkedInAt,
        timeLabel: formatCheckInClock(checkedInAt),
        dateLabel: formatCheckInDateLabel(checkedInAt),
        emailSent,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

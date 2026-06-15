import { NextRequest, NextResponse } from "next/server";

import {
  isMissingEmployeesTable,
  isMissingLeaveTable,
  mapLeaveRow,
  type EmployeeLeaveRow,
} from "@/lib/employees/db-mapper";
import {
  buildLeaveApplicationNotes,
  leaveTypeRequiresAttachment,
  parsePublicLeaveFormType,
  validateAdvanceLeaveStart,
} from "@/lib/employees/leave-application";
import { validateLeaveSignatureDataUrl } from "@/lib/employees/leave-signature";
import { isValidLeaveDate } from "@/lib/employees/leave-rules";
import { lookupEmployeeByToken } from "@/lib/employees/process-employee-scan";
import { eatTodayDayKey } from "@/lib/time/eat";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

const LEAVE_SELECT =
  "id,owner_id,employee_id,start_date,end_date,leave_type,status,notes,approved_at,rejected_at,notification_sent_at,created_at,updated_at";

function safeText(v: unknown, max: number): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  return s.slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const token = safeText(body.token ?? body.qrToken, 200);
    const startDate = safeText(body.startDate ?? body.start_date, 10);
    const endDate = safeText(body.endDate ?? body.end_date, 10);
    const leaveType = parsePublicLeaveFormType(body.leaveType ?? body.leave_type);
    const reason = safeText(body.reason, 2000);
    const attachmentName = safeText(body.attachmentName ?? body.attachment_name, 200);
    const signatureDataUrl = String(body.signatureDataUrl ?? body.signature_data_url ?? "").trim();

    if (!token) {
      return NextResponse.json({ error: "Missing employee link token." }, { status: 400 });
    }
    if (!leaveType) {
      return NextResponse.json(
        {
          error:
            "Select a valid leave type: annual, casual, sick, compassionate, or unpaid.",
        },
        { status: 400 }
      );
    }
    if (!validateLeaveSignatureDataUrl(signatureDataUrl)) {
      return NextResponse.json(
        { error: "Draw your signature in the applicant signature box before submitting." },
        { status: 400 }
      );
    }
    if (!reason) {
      return NextResponse.json({ error: "Enter a reason for taking leave." }, { status: 400 });
    }
    if (!isValidLeaveDate(startDate) || !isValidLeaveDate(endDate)) {
      return NextResponse.json({ error: "Use valid start and end dates." }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: "End date must be on or after start date." }, { status: 400 });
    }

    const advanceCheck = validateAdvanceLeaveStart(startDate, leaveType);
    if (!advanceCheck.ok) {
      return NextResponse.json({ error: advanceCheck.error }, { status: 400 });
    }

    if (leaveTypeRequiresAttachment(leaveType) && !attachmentName) {
      return NextResponse.json(
        { error: "Attach a supportive document for sick leave." },
        { status: 400 }
      );
    }

    const lookup = await lookupEmployeeByToken(admin, token);
    if (!lookup.ok) {
      return NextResponse.json({ error: lookup.error }, { status: lookup.status });
    }

    const employee = lookup.employee;
    if (employee.status !== "active") {
      return NextResponse.json({ error: "This employee profile is inactive." }, { status: 403 });
    }

    const { data: rowData } = await admin
      .from("visitor_employees")
      .select("owner_id")
      .eq("id", employee.id)
      .maybeSingle();

    const ownerId = String(rowData?.owner_id ?? "");
    if (!ownerId) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    const { data: overlapping } = await admin
      .from("visitor_employee_leave")
      .select("id,status,start_date,end_date")
      .eq("employee_id", employee.id)
      .in("status", ["pending", "approved"])
      .lte("start_date", endDate)
      .gte("end_date", startDate)
      .limit(1);

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json(
        {
          error:
            "You already have a pending or approved leave request that overlaps these dates. Contact your manager if you need to change it.",
        },
        { status: 409 }
      );
    }

    const notes = buildLeaveApplicationNotes({
      reason,
      attachmentName,
      signerName: employee.fullName,
      signedAtYmd: eatTodayDayKey(),
      signatureDataUrl,
    });

    const { data, error } = await admin
      .from("visitor_employee_leave")
      .insert({
        owner_id: ownerId,
        employee_id: employee.id,
        start_date: startDate,
        end_date: endDate,
        leave_type: leaveType,
        status: "pending",
        notes,
      })
      .select(LEAVE_SELECT)
      .single();

    if (error) {
      if (isMissingLeaveTable(error) || isMissingEmployeesTable(error)) {
        return NextResponse.json(
          { error: "Leave management is not set up for this organisation." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      leave: mapLeaveRow(data as EmployeeLeaveRow),
      message:
        "Your leave application was submitted and is pending manager approval. You will be notified by email once it is approved.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

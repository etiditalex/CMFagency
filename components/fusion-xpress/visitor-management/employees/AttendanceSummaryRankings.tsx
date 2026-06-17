"use client";

import SummaryReportExcelButton from "@/components/fusion-xpress/visitor-management/employees/SummaryReportExcelButton";
import type {
  AttendanceSummaryRankEntry,
  AttendanceSummaryRankings,
} from "@/lib/employees/attendance-summary";
import { memberTypeLabel } from "@/lib/employees/real-estate";

function RankingsTable({
  title,
  subtitle,
  rows,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  rows: AttendanceSummaryRankEntry[];
  emptyMessage: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white print:break-inside-avoid">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2.5 font-semibold">Rank</th>
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Team</th>
              <th className="px-4 py-2.5 font-semibold">Department</th>
              <th className="px-4 py-2.5 font-semibold">Detail</th>
              <th className="px-4 py-2.5 font-semibold text-right">Metric</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={`${title}-${r.employeeId}`} className="border-b border-gray-100">
                  <td className="px-4 py-2.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-extrabold text-primary-800">
                      {r.rank}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-gray-900">{r.fullName}</td>
                  <td className="px-4 py-2.5 text-gray-700">{memberTypeLabel(r.memberType)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{r.department || "—"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.detail || "—"}</td>
                  <td className="px-4 py-2.5 text-right font-extrabold text-primary-800">
                    {r.metric}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type Props = {
  rankings: AttendanceSummaryRankings;
  exportingExcel?: boolean;
  onExportExcel?: () => void;
};

export default function AttendanceSummaryRankingsPanel({
  rankings,
  exportingExcel = false,
  onExportExcel,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Staff rankings</h2>
            <p className="text-xs text-gray-500 mt-1">
              Based on deduplicated attendance (one sign-in and one sign-out per person per day).
            </p>
          </div>
          {onExportExcel ? (
            <SummaryReportExcelButton
              loading={exportingExcel}
              onClick={onExportExcel}
            />
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4">
          <RankingsTable
            title="Most days attended"
            subtitle="Staff with the most days signed in"
            rows={rankings.staff.mostAttendant}
            emptyMessage="No staff attendance in this period."
          />
          <RankingsTable
            title="Earliest arrivals"
            subtitle="Average first sign-in time (staff)"
            rows={rankings.staff.earliestArrival}
            emptyMessage="No staff sign-ins in this period."
          />
        </div>
      </div>

      <div>
        <h2 className="text-base font-extrabold text-gray-900">CRM rankings</h2>
        <p className="text-xs text-gray-500 mt-1">
          CRM may visit flexibly; each day allows one sign-in and one sign-out only.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4">
          <RankingsTable
            title="Most days attended"
            subtitle="CRM with the most days signed in"
            rows={rankings.crm.mostAttendant}
            emptyMessage="No CRM attendance in this period."
          />
          <RankingsTable
            title="Earliest arrivals"
            subtitle="Average first sign-in time (CRM)"
            rows={rankings.crm.earliestArrival}
            emptyMessage="No CRM sign-ins in this period."
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import SummaryReportExcelButton from "@/components/fusion-xpress/visitor-management/employees/SummaryReportExcelButton";
import type {
  AttendanceSummaryRankEntry,
  AttendanceSummaryRankings,
} from "@/lib/employees/attendance-summary";
import { memberTypeLabel } from "@/lib/employees/real-estate";

function RankTable({
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
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden print:break-inside-avoid">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-500 text-center">{emptyMessage}</p>
      ) : (
        <ol className="divide-y divide-gray-100">
          {rows.map((r) => (
            <li key={`${title}-${r.employeeId}`} className="flex items-start gap-3 px-4 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-extrabold text-primary-800">
                {r.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 truncate">{r.fullName}</p>
                <p className="text-xs text-gray-500 truncate">
                  {r.department || memberTypeLabel(r.memberType)}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">{r.detail}</p>
              </div>
              <span className="text-sm font-extrabold text-primary-800 whitespace-nowrap">
                {r.metric}
              </span>
            </li>
          ))}
        </ol>
      )}
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
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RankTable
            title="Most days attended"
            subtitle="Staff with the most days signed in"
            rows={rankings.staff.mostAttendant}
            emptyMessage="No staff attendance in this period."
          />
          <RankTable
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
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RankTable
            title="Most days attended"
            subtitle="CRM with the most days signed in"
            rows={rankings.crm.mostAttendant}
            emptyMessage="No CRM attendance in this period."
          />
          <RankTable
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

"use client";

import type { CrmSiteVisitRankEntry } from "@/lib/employees/crm-site-types";

type Props = {
  rankings: CrmSiteVisitRankEntry[];
  fromLabel: string;
  toLabel: string;
};

export default function CrmSiteVisitRankings({ rankings, fromLabel, toLabel }: Props) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-bold text-gray-900">CRM site visit rankings</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Completed site visits ({fromLabel} – {toLabel}). Used for awards — most visits wins
          automatically.
        </p>
      </div>
      {rankings.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-500 text-center">No completed site visits in this period.</p>
      ) : (
        <ol className="divide-y divide-gray-100">
          {rankings.map((r) => (
            <li key={r.employeeId} className="flex items-start gap-3 px-4 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-extrabold text-primary-800">
                {r.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 truncate">{r.fullName}</p>
                {r.openVisit ? (
                  <p className="text-xs text-amber-700 font-semibold mt-0.5">Currently on a site visit</p>
                ) : null}
              </div>
              <span className="text-sm font-extrabold text-primary-800 whitespace-nowrap">
                {r.completedVisits} {r.completedVisits === 1 ? "visit" : "visits"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

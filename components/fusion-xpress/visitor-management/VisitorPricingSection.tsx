import Link from "next/link";
import { Check, X } from "lucide-react";

import { getVisitorSubscriptionPrice } from "@/lib/visitors/subscription-pricing";
import {
  VISITOR_CHECKIN_MARKETING_ROWS,
  VISITOR_EMPLOYEE_MARKETING_ROWS,
  VISITOR_REAL_ESTATE_MARKETING_ROWS,
  type MarketingFeatureRow,
} from "@/lib/visitors/subscription-marketing-features";

type PlanCol = "trial" | "professional" | "enterprise";

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === "string") {
    return <span className="text-sm text-gray-700">{value}</span>;
  }
  return value ? (
    <Check className="w-5 h-5 text-emerald-600 mx-auto" aria-label="Included" />
  ) : (
    <X className="w-5 h-5 text-red-400 mx-auto" aria-label="Not included" />
  );
}

function FeatureTable({
  title,
  subtitle,
  rows,
  highlightCol,
}: {
  title: string;
  subtitle?: string;
  rows: MarketingFeatureRow[];
  highlightCol: PlanCol;
}) {
  const cols: PlanCol[] = ["trial", "professional", "enterprise"];
  const headers: Record<PlanCol, string> = {
    trial: "Free for 7 days",
    professional: "Professional",
    enterprise: "Enterprise",
  };

  return (
    <div className="mt-12 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="w-1 h-6 rounded-full bg-primary-600" aria-hidden />
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {subtitle ? <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p> : null}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-4 py-3 font-semibold text-gray-600">Feature</th>
              {cols.map((col) => (
                <th
                  key={col}
                  className={`px-4 py-3 font-semibold text-center ${
                    col === highlightCol ? "bg-primary-50 text-primary-700" : "text-gray-600"
                  }`}
                >
                  {headers[col]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-gray-50">
                <td className="px-4 py-3 text-gray-800">{row.label}</td>
                {cols.map((col) => (
                  <td
                    key={col}
                    className={`px-4 py-3 text-center ${
                      col === highlightCol ? "bg-primary-50/60" : ""
                    }`}
                  >
                    <CellValue value={row[col]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function VisitorPricingSection() {
  const proMonthly = getVisitorSubscriptionPrice("professional", "monthly");
  const proAnnual = getVisitorSubscriptionPrice("professional", "annual");
  const entMonthly = getVisitorSubscriptionPrice("enterprise", "monthly");
  const entAnnual = getVisitorSubscriptionPrice("enterprise", "annual");

  return (
    <section className="w-full border-t border-gray-100 bg-gray-50 py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-base text-gray-600 md:text-lg">
            Start free for 7 days, then choose the plan that fits your reception and team.
          </p>
        </div>

        <div className="mt-12 grid w-full grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8 xl:gap-10">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col">
            <h3 className="text-xl font-bold text-gray-900">Free for 7 days</h3>
            <p className="mt-3 text-4xl font-extrabold text-primary-600">Free</p>
            <p className="mt-2 text-sm text-gray-600">
              Limited visitor check-ins, exports, group check-in, and workplace GPS trial.
            </p>
            <ul className="mt-3 text-xs text-gray-600 space-y-1 list-disc list-inside flex-1">
              <li>Up to 1,000 check-ins</li>
              <li>Up to 500 pre-registrations</li>
              <li>No employee module or QR downloads</li>
            </ul>
            <Link
              href="/fusion-xpress/smart-visitor-management/sign-up"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg border-2 border-primary-600 px-4 py-2.5 text-sm font-bold text-primary-700 hover:bg-primary-50"
            >
              Start free trial
            </Link>
          </div>

          <div className="relative rounded-2xl border-2 border-primary-600 bg-white p-6 shadow-md flex flex-col">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-3 py-1 text-xs font-bold text-white">
              Most popular
            </span>
            <h3 className="text-xl font-bold text-gray-900">Professional</h3>
            <p className="mt-3">
              <span className="text-4xl font-extrabold text-primary-600">${proMonthly.usd.toFixed(2)}</span>
              <span className="text-sm text-gray-500 ml-1">/ month</span>
            </p>
            <p className="mt-1 text-sm font-semibold text-primary-700">
              Annual — ${proAnnual.usd.toFixed(2)}/year (12 months)
            </p>
            <ul className="mt-3 text-sm text-gray-600 space-y-1.5 flex-1">
              <li>Unlimited visitors & pre-registration</li>
              <li>Full employee attendance + QR PDFs</li>
              <li>Workplace GPS, summary reports & Excel</li>
              <li>Director email notifications</li>
            </ul>
            <Link
              href="/fusion-xpress/smart-visitor-management/sign-up"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-700"
            >
              Get Professional
            </Link>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm flex flex-col ring-1 ring-emerald-100">
            <span className="text-xs font-bold uppercase tracking-wide text-emerald-800">Real estate</span>
            <h3 className="text-xl font-bold text-gray-900 mt-1">Enterprise</h3>
            <p className="mt-3">
              <span className="text-4xl font-extrabold text-primary-600">${entMonthly.usd.toFixed(2)}</span>
              <span className="text-sm text-gray-500 ml-1">/ month</span>
            </p>
            <p className="mt-1 text-sm font-semibold text-primary-700">
              Annual — ${entAnnual.usd.toFixed(2)}/year (12 months)
            </p>
            <ul className="mt-3 text-sm text-gray-600 space-y-1.5 flex-1">
              <li>Everything in Professional</li>
              <li>Staff & CRM teams with separate reporting times</li>
              <li>CRM site GPS — project visits & visit rankings</li>
              <li>Priority support</li>
            </ul>
            <Link
              href="/fusion-xpress/smart-visitor-management/sign-up"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg border-2 border-emerald-600 px-4 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
            >
              Get Enterprise
            </Link>
          </div>
        </div>

        <FeatureTable
          title="Check-in & check-out"
          rows={VISITOR_CHECKIN_MARKETING_ROWS}
          highlightCol="professional"
        />
        <FeatureTable
          title="Employee & attendance"
          rows={VISITOR_EMPLOYEE_MARKETING_ROWS}
          highlightCol="professional"
        />
        <FeatureTable
          title="Real Estate (Enterprise)"
          subtitle="For property developers and agencies — staff plus CRM field teams."
          rows={VISITOR_REAL_ESTATE_MARKETING_ROWS}
          highlightCol="enterprise"
        />
      </div>
    </section>
  );
}

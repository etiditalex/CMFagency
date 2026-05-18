import Link from "next/link";
import { Check, X } from "lucide-react";

import {
  VISITOR_CHECKIN_TRIAL_LIMIT,
  VISITOR_PREREGISTER_TRIAL_LIMIT,
} from "@/lib/visitors/subscription";

type PlanCol = "trial" | "basic" | "enterprise";

type FeatureRow = {
  label: string;
  trial: string | boolean;
  basic: string | boolean;
  enterprise: string | boolean;
};

const CHECKIN_ROWS: FeatureRow[] = [
  {
    label: "Contactless check-in via smart QR codes",
    trial: `Up to ${VISITOR_CHECKIN_TRIAL_LIMIT.toLocaleString()}`,
    basic: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    label: "Pre-register expected guests",
    trial: `Up to ${VISITOR_PREREGISTER_TRIAL_LIMIT}`,
    basic: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    label: "Automatically check out guests",
    trial: false,
    basic: true,
    enterprise: true,
  },
  {
    label: "Fast visitor record entry via copy & paste",
    trial: false,
    basic: true,
    enterprise: true,
  },
  {
    label: "Data export into CSV or PDF",
    trial: true,
    basic: true,
    enterprise: true,
  },
  {
    label: "Group check-in (up to 5 people)",
    trial: true,
    basic: true,
    enterprise: true,
  },
];

const EMPLOYEE_ROWS: FeatureRow[] = [
  {
    label: "Employee attendance module",
    trial: false,
    basic: true,
    enterprise: true,
  },
  {
    label: "Reception QR + phone-linked member ID",
    trial: false,
    basic: true,
    enterprise: true,
  },
  {
    label: "Staff / CRM teams & reporting times (Real Estate)",
    trial: false,
    basic: false,
    enterprise: true,
  },
  {
    label: "Attendance Excel export & notification admins",
    trial: false,
    basic: true,
    enterprise: true,
  },
];

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
  rows,
  highlightCol,
}: {
  title: string;
  rows: FeatureRow[];
  highlightCol: PlanCol;
}) {
  const cols: PlanCol[] = ["trial", "basic", "enterprise"];
  const headers: Record<PlanCol, string> = {
    trial: "Free for 7 days",
    basic: "Basic",
    enterprise: "Enterprise",
  };

  return (
    <div className="mt-12 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="w-1 h-6 rounded-full bg-primary-600" aria-hidden />
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
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
              Try core visitor features for 7 days — no credit card required.
            </p>
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
            <h3 className="text-xl font-bold text-gray-900">Basic</h3>
            <p className="mt-3">
              <span className="text-4xl font-extrabold text-primary-600">$9.90</span>
              <span className="text-sm text-gray-500 ml-1">AUD / month</span>
            </p>
            <p className="mt-1 text-sm font-semibold text-primary-700">Save with annual billing — $99/year</p>
            <p className="mt-2 text-sm text-gray-600 flex-1">
              Professional visitor management plus employee attendance at reception.
            </p>
            <Link
              href="/fusion-xpress/smart-visitor-management/sign-up"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-700"
            >
              Get started
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col">
            <h3 className="text-xl font-bold text-gray-900">Enterprise</h3>
            <p className="mt-3">
              <span className="text-4xl font-extrabold text-primary-600">$35.09</span>
              <span className="text-sm text-gray-500 ml-1">AUD / month</span>
            </p>
            <p className="mt-1 text-sm font-semibold text-primary-700">Save with annual billing — $421.15/year</p>
            <p className="mt-2 text-sm text-gray-600 flex-1">
              Everything in Basic, plus Real Estate CRM/staff teams, priority support, and all add-ons.
            </p>
            <Link
              href="/fusion-xpress/smart-visitor-management/sign-up"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg border-2 border-primary-600 px-4 py-2.5 text-sm font-bold text-primary-700 hover:bg-primary-50"
            >
              Get Enterprise
            </Link>
          </div>
        </div>

        <div className="mt-12 w-full space-y-0">
          <FeatureTable title="Check-in & check-out" rows={CHECKIN_ROWS} highlightCol="basic" />
          <FeatureTable title="Employee module" rows={EMPLOYEE_ROWS} highlightCol="basic" />
        </div>
      </div>
    </section>
  );
}

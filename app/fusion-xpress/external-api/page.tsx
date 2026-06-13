import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Calculator,
  CalendarDays,
  ClipboardList,
  KeyRound,
  Lock,
  Plug,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create an API Key",
    description:
      "Sign in to your Fusion Xpress dashboard, open Visitor Management → Employees, and generate a named integration key.",
    icon: KeyRound,
    iconWrap: "bg-primary-100 text-primary-700",
  },
  {
    step: "02",
    title: "Authenticate Requests",
    description:
      "Send your key as a Bearer token on every call. Keys use the fx_int_live_ prefix and are scoped to your organisation.",
    icon: Lock,
    iconWrap: "bg-secondary-100 text-secondary-800",
  },
  {
    step: "03",
    title: "Sync & Update Data",
    description:
      "Read attendance and leave, update employee pay rates, approve leave, and configure payroll deduction rules from your HR system.",
    icon: RefreshCw,
    iconWrap: "bg-primary-50 text-primary-600 ring-1 ring-primary-200",
  },
  {
    step: "04",
    title: "Run Automated Payroll",
    description:
      "Fusion Xpress calculates gross pay from hours or days worked. Enable optional time rules (late, early leave, overtime, unpaid leave) only when you need them.",
    icon: ArrowLeftRight,
    iconWrap: "bg-secondary-50 text-secondary-700 ring-1 ring-secondary-200",
  },
] as const;

const API_ENDPOINTS: {
  icon: LucideIcon;
  title: string;
  description: string;
  scope: string;
  iconWrap: string;
}[] = [
  {
    icon: Users,
    title: "Employees",
    description:
      "List and update staff profiles, pay type (hourly or monthly), pay rate, department, and employment status.",
    scope: "employees:read · write",
    iconWrap: "bg-primary-100 text-primary-700",
  },
  {
    icon: ClipboardList,
    title: "Attendance",
    description:
      "Export raw sign-in and sign-out events for a date range—filter by employee or limit results for large teams.",
    scope: "attendance:read",
    iconWrap: "bg-secondary-100 text-secondary-800",
  },
  {
    icon: CalendarDays,
    title: "Leave",
    description:
      "Read, create, and approve leave records. Unpaid leave deductions apply only when enabled in payroll settings.",
    scope: "leave:read · write",
    iconWrap: "bg-primary-50 text-primary-600 ring-1 ring-primary-200",
  },
  {
    icon: Calculator,
    title: "Payroll",
    description:
      "Run a payroll period—hours or days × pay rate by default, with optional time-based deductions when configured.",
    scope: "payroll:read · write",
    iconWrap: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  },
  {
    icon: Plug,
    title: "Daily Register",
    description:
      "One row per employee per day—present with sign-in/out times or on approved leave. Built for payroll and HR exports.",
    scope: "register:read",
    iconWrap: "bg-secondary-50 text-secondary-700 ring-1 ring-secondary-200",
  },
];

const SECURITY_FEATURES: {
  icon: LucideIcon;
  title: string;
  description: string;
  iconWrap: string;
}[] = [
  {
    icon: Shield,
    title: "Scoped Access",
    description:
      "Each key uses scoped permissions—read/write for employees, leave, and payroll—so integrators only access what they need.",
    iconWrap: "bg-primary-100 text-primary-700",
  },
  {
    icon: KeyRound,
    title: "Revocable Keys",
    description:
      "Create multiple named keys for different systems and revoke any key instantly from the dashboard if access should stop.",
    iconWrap: "bg-secondary-100 text-secondary-800",
  },
  {
    icon: Lock,
    title: "Secure Transport",
    description:
      "All requests use HTTPS with Bearer authentication. Keys are stored as hashes—only you see the full secret once at creation.",
    iconWrap: "bg-primary-50 text-primary-600 ring-1 ring-primary-200",
  },
];

export const metadata = {
  title: "External API | Fusion Xpress",
  description:
    "Two-way HR and payroll integration—sync employees, run payroll (simple or with optional time rules), and connect to Sage, SAP, or your own systems.",
};

export default function ExternalApiPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative mt-16 w-full overflow-hidden sm:mt-20 md:mt-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(105deg, rgba(15,47,100,0.55) 0%, rgba(15,47,100,0.2) 42%, transparent 68%)",
          }}
        />
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary-400/25 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-secondary-400/20 blur-3xl pointer-events-none" />

        <div className="relative container-custom">
          <div className="grid min-h-0 grid-cols-1 items-center gap-6 py-8 sm:gap-10 sm:py-14 md:min-h-[min(72vh,640px)] md:gap-10 md:py-16 lg:grid-cols-2 lg:gap-12 lg:py-20">
            <div className="order-2 w-full max-w-xl justify-self-start text-left text-white lg:order-1 lg:pr-4">
              <p className="!text-left text-[0.7rem] font-bold uppercase tracking-[0.12em] text-secondary-200 sm:text-xs sm:tracking-[0.2em]">
                Fusion Xpress · External API
              </p>
              <h1 className="!text-left mt-3 text-2xl font-extrabold leading-[1.15] tracking-tight sm:mt-4 sm:text-4xl md:text-[2.65rem] lg:text-5xl">
                Connect attendance to HR &amp; payroll.
                <span className="block mt-1 text-left text-white/95">Read, write, and automate payroll.</span>
              </h1>
              <p className="!text-left mt-4 text-sm leading-relaxed text-white/90 sm:mt-5 sm:text-base md:text-lg md:max-w-lg">
                Sync employee records, update pay rates, approve leave, and run payroll. Time-based rules—late
                arrival, early departure, overtime, and unpaid leave—are optional and off by default.
              </p>
              <div className="mt-6 flex flex-row flex-nowrap items-center justify-start gap-3 sm:mt-8">
                <Link
                  href="/fusion-xpress/smart-visitor-management/sign-up"
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full bg-secondary-400 px-5 py-3 text-sm font-bold text-primary-950 shadow-lg shadow-black/15 transition-colors hover:bg-secondary-300 active:scale-[0.99] sm:flex-none sm:px-8 sm:py-3.5 sm:text-base"
                >
                  Get Started
                </Link>
                <a
                  href="/api/integrations/v1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full border-2 border-white/90 bg-transparent px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 active:scale-[0.99] sm:flex-none sm:px-8 sm:py-3.5 sm:text-base"
                >
                  View API Docs
                </a>
              </div>
            </div>

            <div className="order-1 relative mx-auto w-full max-w-md sm:max-w-xl lg:order-2 lg:max-w-none lg:mx-0">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_20px_40px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-secondary-200">Example request</p>
                <pre className="mt-4 overflow-x-auto rounded-xl bg-primary-950/80 p-4 text-left text-xs leading-relaxed text-emerald-200 sm:text-sm">
                  <code>{`GET /api/integrations/v1/payroll
  ?from=2026-06-01&to=2026-06-30
Authorization: Bearer fx_int_live_…

→ grossPay, deductions, netPay
  (late mins, early leave, unpaid leave)`}</code>
                </pre>
                <p className="mt-4 text-xs text-white/75">
                  Discovery endpoint:{" "}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/90">/api/integrations/v1</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-white py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
              How the External API Works
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600 md:text-lg">
              From dashboard key creation to automated payroll sync—a straightforward integration flow.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 sm:mt-12 sm:grid-cols-2 sm:gap-8 lg:mt-16 lg:grid-cols-4 lg:gap-6 xl:gap-8">
            {HOW_IT_WORKS.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="flex flex-col items-center text-center">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-extrabold text-white shadow-md ${
                      index % 2 === 0 ? "bg-primary-600" : "bg-secondary-600"
                    }`}
                  >
                    {item.step}
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-gray-900 md:text-xl">{item.title}</h3>
                  <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-gray-600 md:text-[0.9375rem]">
                    {item.description}
                  </p>
                  <div className="mt-8 w-full max-w-[260px] rounded-2xl border border-gray-100 bg-white p-8 shadow-[0_8px_30px_rgba(15,47,100,0.08)] sm:max-w-none">
                    <div
                      className={`mx-auto flex h-20 w-20 items-center justify-center rounded-2xl ${item.iconWrap}`}
                    >
                      <Icon className="h-10 w-10" strokeWidth={1.75} aria-hidden />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="w-full border-t border-gray-100 bg-gray-50/80 py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
              API Endpoints
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600 md:text-lg">
              REST resources under{" "}
              <code className="rounded bg-gray-200/80 px-1.5 py-0.5 text-sm font-semibold text-gray-800">
                /api/integrations/v1
              </code>
              — read and write. All dates use East Africa Time (EAT).
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-5 xl:gap-6">
            {API_ENDPOINTS.map((endpoint) => {
              const Icon = endpoint.icon;
              return (
                <article
                  key={endpoint.title}
                  className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-5 py-7 text-center shadow-sm transition-shadow hover:shadow-md sm:px-6 sm:py-8"
                >
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl ${endpoint.iconWrap}`}
                  >
                    <Icon className="h-8 w-8" strokeWidth={1.75} aria-hidden />
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-gray-900">{endpoint.title}</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-primary-600">
                    {endpoint.scope}
                  </p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-600">{endpoint.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="w-full border-t border-gray-100 bg-gray-50 py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="grid grid-cols-1 items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
            <div className="flex w-full flex-col justify-center text-left lg:pr-4">
              <h2 className="text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl md:text-[2.65rem] md:leading-[1.12]">
                Built for payroll &amp; HR teams
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-gray-600">
                The payroll endpoint pays from hours worked or days present by default. Turn on optional time
                rules in payroll-settings when you want late, early-leave, overtime, or unpaid-leave calculations.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-gray-700">
                {[
                  "Hourly or monthly pay types per employee",
                  "Simple mode: hours × rate or days × daily rate (default)",
                  "Optional late & early-leave deductions when enabled",
                  "Optional overtime and unpaid-leave rules when enabled",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary-500" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard/visitor-management/employees"
                className="mt-10 inline-flex min-h-[48px] items-center justify-center self-start rounded-full bg-secondary-400 px-10 py-3 text-base font-bold text-white shadow-md transition-colors hover:bg-secondary-500"
              >
                Manage API Keys
              </Link>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,47,100,0.1)] sm:p-8">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Sample response shape</p>
                <pre className="mt-4 overflow-x-auto rounded-xl bg-gray-900 p-4 text-left text-xs leading-relaxed text-gray-100 sm:text-sm">
                  <code>{`{
  "employees": [{
    "fullName": "Jane Doe",
    "totalHoursWorked": 168,
    "grossPay": 84000,
    "deductions": [
      { "code": "late_arrival",
        "minutes": 45, "amount": 2250 },
      { "code": "unpaid_leave",
        "days": 1, "amount": 4000 }
    ],
    "netPay": 77750
  }],
  "totals": { "netPay": 312000 }
}`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full border-t border-gray-100 bg-white py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
              Security &amp; access control
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600 md:text-lg">
              Integration keys are designed for external systems—not for end-user login.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3 lg:mt-14 lg:gap-6">
            {SECURITY_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-5 py-8 text-center shadow-sm transition-shadow hover:shadow-md sm:px-6"
                >
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${feature.iconWrap}`}
                  >
                    <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-gray-900">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-r from-secondary-400 via-secondary-500 to-secondary-600"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" aria-hidden />
        <div className="relative w-full px-4 py-14 text-center sm:px-6 sm:py-16 md:py-20 lg:px-10 xl:px-14">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl md:leading-tight">
              Ready to connect your systems?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/95 sm:mt-5 sm:text-lg">
              Start with Smart Visitor Management, create an integration key in minutes, and point your HR or payroll
              software at the Fusion Xpress External API.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4">
              <Link
                href="/fusion-xpress/smart-visitor-management/sign-up"
                className="inline-flex min-h-[48px] w-full min-w-[200px] items-center justify-center rounded-full bg-white px-8 py-3 text-base font-bold text-secondary-700 shadow-lg transition-colors hover:bg-white/95 sm:w-auto"
              >
                Get Started Free
              </Link>
              <Link
                href="/contact?subject=Fusion%20Xpress%20External%20API"
                className="inline-flex min-h-[48px] w-full min-w-[200px] items-center justify-center rounded-full border-2 border-white bg-transparent px-8 py-3 text-base font-bold text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                Talk to Integration Support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

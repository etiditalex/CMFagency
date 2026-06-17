import {
  CRM_SITE_CHECK_PATH,
  VISITOR_MANAGEMENT_EMPLOYEES_CRM_SITE_GPS_PATH,
  VISITOR_MANAGEMENT_EMPLOYEES_GPS_PATH,
  VISITOR_MANAGEMENT_EMPLOYEES_KIOSK_PATH,
  VISITOR_MANAGEMENT_EMPLOYEES_PATH,
  VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_PATH,
  VISITOR_MANAGEMENT_HR_PAYROLL_API_PATH,
  VISITOR_MANAGEMENT_LEAVE_PATH,
  VISITOR_MANAGEMENT_PATH,
  VISITOR_MANAGEMENT_SUBSCRIPTION_PATH,
} from "@/lib/visitors/industry-options";

export type DocLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type DocStep = {
  title: string;
  body: string;
};

export type DocSection = {
  id: string;
  title: string;
  summary: string;
  bullets?: string[];
  steps?: DocStep[];
  links?: DocLink[];
  note?: string;
};

export const VISITOR_MANAGEMENT_DOC_SECTIONS: DocSection[] = [
  {
    id: "overview",
    title: "System overview",
    summary:
      "Fusion Xpress Smart Visitor Management is a QR-based platform for guest check-ins and employee attendance. One organisation account manages visitors, staff, leave, GPS, and reports from the dashboard. Employees and guests interact through shareable links and QR codes — no app install required.",
    bullets: [
      "Dashboard (managers): register guests, approve visits, manage employees, review attendance, approve leave, export reports.",
      "Public flows (staff & guests): scan a QR or open a personal link on any phone to check in, check out, apply for leave, or complete a visitor form.",
      "Industry forms: tailored visitor check-in fields for retail, health, real estate, education, sports, and tourism.",
      "All times use East Africa Time (EAT) for day boundaries and reporting.",
    ],
    links: [
      { label: "Visitor Management dashboard", href: VISITOR_MANAGEMENT_PATH },
      { label: "Marketing overview", href: "/fusion-xpress/smart-visitor-management", external: true },
    ],
  },
  {
    id: "getting-started",
    title: "Getting started",
    summary:
      "Sign up for a Smart Visitor Management account, verify your email, and complete two-factor authentication. Set your organisation industry — this controls which visitor form and employee features you see.",
    steps: [
      {
        title: "Create your account",
        body: "Use Sign up on the Smart Visitor Management landing page. Choose your industry during registration.",
      },
      {
        title: "Open the dashboard",
        body: "After sign-in, open Visitor Management in the sidebar. Trial accounts get 7 days of access before subscribing.",
      },
      {
        title: "Share your visitor check-in link",
        body: "On the main Visitor Management page, copy the public check-in URL for your industry and display it at reception or on signage.",
      },
      {
        title: "Add employees",
        body: "Go to Employees, add staff records, then download or share each employee's personal QR code for attendance.",
      },
    ],
    links: [
      { label: "Sign in", href: "/fusion-xpress/smart-visitor-management/sign-in", external: true },
      { label: "Subscription", href: VISITOR_MANAGEMENT_SUBSCRIPTION_PATH },
    ],
  },
  {
    id: "visitors",
    title: "Visitor management",
    summary:
      "Track guests from pre-registration through check-in and check-out. Managers see today's visitors, pending approvals, and full history on the main Visitor Management page.",
    bullets: [
      "Register a guest manually from the dashboard or let visitors self-check-in via your public industry form link.",
      "Workflow: Pending → Approved → Checked in → Checked out.",
      "Each approved visitor can receive a QR pass for quick entry.",
      "Filter the dashboard by industry when your organisation serves multiple visitor types.",
      "Demo form submissions from industry preview links appear in your visitor list.",
    ],
    steps: [
      {
        title: "Pre-register a guest",
        body: "Click Register guest, enter name, phone, host, and visit purpose. The record starts as Pending until you approve it.",
      },
      {
        title: "Approve and check in",
        body: "Approve the visit, then mark the guest checked in when they arrive. Check them out when they leave.",
      },
      {
        title: "Public self check-in",
        body: "Share your industry check-in URL. Visitors complete the form on their phone; new submissions appear in your dashboard for review.",
      },
    ],
    links: [{ label: "Visitor dashboard", href: VISITOR_MANAGEMENT_PATH }],
  },
  {
    id: "employees",
    title: "Employee attendance",
    summary:
      "Each employee has a profile with department, designation, and a unique QR token. Staff sign in and sign out by scanning their personal QR or using the reception gate flow on a shared device.",
    bullets: [
      "Personal QR link: employee opens their link and taps Sign in or Sign out.",
      "Reception gate QR: one QR at reception; each employee scans and enters their code to record attendance on a shared tablet or phone.",
      "Kiosk scanner: reception staff open the Kiosk page and scan employee QR codes with the device camera.",
      "Attendance log: every sign-in/out is recorded with time, device/browser label, and optional GPS.",
      "Reporting times: configure expected arrival windows; late or early sign-ins are flagged (retail/hospitality and real estate).",
      "Notification admins: directors receive email when employees sign in or out.",
    ],
    steps: [
      {
        title: "Add an employee",
        body: "Employees → Add employee. Fill name, email, department, job title, and member type (staff or CRM for real estate).",
      },
      {
        title: "Distribute QR codes",
        body: "Open the employee's QR modal to copy their link or download a printable PDF pass.",
      },
      {
        title: "Set up reception (optional)",
        body: "Use Reception QR to generate a gate link for a shared device at the front desk.",
      },
      {
        title: "Review attendance",
        body: "The attendance log on the Employees page lists every event. Managers can edit times if a correction is needed.",
      },
    ],
    links: [
      { label: "Employees", href: VISITOR_MANAGEMENT_EMPLOYEES_PATH },
      { label: "Kiosk scanner", href: VISITOR_MANAGEMENT_EMPLOYEES_KIOSK_PATH },
      {
        label: "Employee check-in page",
        href: "/fusion-xpress/smart-visitor-management/employee-check",
        external: true,
      },
    ],
  },
  {
    id: "leave",
    title: "Leave management",
    summary:
      "Employees apply for leave through a personal link with a digital signature. Managers review pending requests on the Leave page and approve or reject them.",
    bullets: [
      "Leave types: Annual, Casual, Sick, Compassionate, and Unpaid.",
      "Annual, casual, and unpaid leave require at least 2 days advance notice before the first absent day.",
      "Sick and compassionate leave can be submitted for urgent circumstances.",
      "Sick leave requires a supporting document attachment (JPEG, PNG, WebP, or PDF).",
      "Approved leave is stored with the employee record; the employee can be notified by email on approval.",
    ],
    steps: [
      {
        title: "Share the leave link",
        body: "On the Employees page, copy each employee's leave application link (same token as their attendance QR).",
      },
      {
        title: "Employee submits the form",
        body: "The employee opens the link, confirms auto-filled details, selects leave type and dates, writes a reason, signs digitally, and submits.",
      },
      {
        title: "Manager reviews",
        body: "Pending requests appear on the Leave page in the sidebar. Approve or reject; optional email notification is sent on approval.",
      },
    ],
    links: [
      { label: "Leave", href: VISITOR_MANAGEMENT_LEAVE_PATH },
      {
        label: "Leave application form",
        href: "/fusion-xpress/smart-visitor-management/employee-leave",
        external: true,
      },
    ],
  },
  {
    id: "gps",
    title: "GPS tracking",
    summary:
      "Record where employees sign in and out. Set a workplace geofence so attendance events include location context for compliance and field teams.",
    bullets: [
      "Workplace GPS: define your office coordinates and radius on the GPS tracking page.",
      "When employees check in on a GPS-enabled device, their location is captured alongside the attendance event.",
      "Available on trial and paid plans — useful for multi-site organisations and remote verification.",
    ],
    links: [{ label: "GPS tracking", href: VISITOR_MANAGEMENT_EMPLOYEES_GPS_PATH }],
  },
  {
    id: "crm-site",
    title: "CRM site GPS (real estate)",
    summary:
      "Enterprise real-estate accounts can track field CRM visits to project sites. CRM team members sign in and out at each site with live GPS coordinates.",
    bullets: [
      "Only available when your organisation industry is Real Estate and you are on the Enterprise plan.",
      "Define project sites in the CRM site GPS dashboard.",
      "CRM staff use their personal CRM site check link to record site visits.",
      "Visit logs and staff rankings help managers monitor field activity.",
    ],
    steps: [
      {
        title: "Add project sites",
        body: "CRM site GPS → add sites with name and location. Assign CRM-type employees in the employee roster.",
      },
      {
        title: "Field sign-in",
        body: "CRM staff open their site check link, allow GPS, and sign in when arriving at a project site. Sign out when leaving.",
      },
    ],
    links: [
      { label: "CRM site GPS dashboard", href: VISITOR_MANAGEMENT_EMPLOYEES_CRM_SITE_GPS_PATH },
      { label: "CRM site check page", href: CRM_SITE_CHECK_PATH, external: true },
    ],
    note: "CRM site GPS requires Enterprise subscription and Real Estate industry.",
  },
  {
    id: "reports",
    title: "Summary reports",
    summary:
      "Analyse attendance trends, compare staff sign-in patterns, and export data for payroll or HR. Summary reports are available to all visitor management accounts.",
    bullets: [
      "Date presets: today, last 7 days, last 30 days, this month, or a custom range.",
      "Charts show sign-in/out volumes and leave taken across the selected period.",
      "Staff rankings highlight punctuality and attendance consistency.",
      "Export to Excel: per-employee summary, full attendance register, or rankings.",
      "Print-friendly layout for management meetings.",
    ],
    links: [{ label: "Summary reports", href: VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_PATH }],
  },
  {
    id: "plans",
    title: "Subscription plans",
    summary:
      "Visitor-only accounts start on a 7-day free trial, then choose Professional or Enterprise. Features such as the employee module, reception QR, CRM site GPS, and QR downloads depend on your plan.",
    bullets: [
      "Trial (7 days): basic data export, group check-in, GPS tracking.",
      "Professional: unlimited check-in, employee module, reception QR, Excel export, notification admins, employee QR download.",
      "Enterprise: everything in Professional plus real-estate CRM site GPS.",
      "Pay via M-Pesa or card (Paystack) from the Subscription page.",
    ],
    links: [
      { label: "Subscription", href: VISITOR_MANAGEMENT_SUBSCRIPTION_PATH },
      { label: "External API & integrations", href: "/fusion-xpress/external-api", external: true },
    ],
  },
  {
    id: "integrations",
    title: "Integrations & API",
    summary:
      "Connect payroll or HR systems using integration API keys from the HR & Payroll API page. The external API documentation describes attendance sync endpoints for approved partners.",
    bullets: [
      "Generate API keys from the HR & Payroll API page in the sidebar.",
      "Keys authenticate server-to-server requests for attendance and employee data.",
      "Notification admins receive email alerts for attendance events without an API integration.",
    ],
    links: [
      { label: "HR & Payroll API", href: VISITOR_MANAGEMENT_HR_PAYROLL_API_PATH },
      { label: "External API docs", href: "/fusion-xpress/external-api", external: true },
    ],
  },
  {
    id: "access",
    title: "Roles & access",
    summary:
      "Different users see different parts of the system depending on their portal role and assigned features.",
    bullets: [
      "Visitor-only client: access limited to Visitor Management routes, Account settings, and Subscription.",
      "Multi-feature client: Visitor Management appears alongside other Fusion Xpress modules (ticketing, events, etc.).",
      "Platform admin: can open any business using Accounts Manager and the business scope bar (?owner=).",
      "Employer role: does not access Visitor Management — intended for campaign employers, not VM clients.",
      "Two-factor authentication: email code by default, with Google Authenticator required for business accounts as an additional option.",
    ],
  },
];

export const VISITOR_MANAGEMENT_DOC_FLOWS = [
  {
    title: "Guest visit",
    steps: ["Register / self check-in", "Manager approves", "Guest arrives → checked in", "Guest leaves → checked out"],
  },
  {
    title: "Employee attendance",
    steps: ["Employee scans QR", "Sign in recorded", "Work day ends", "Sign out recorded"],
  },
  {
    title: "Leave request",
    steps: ["Employee opens leave link", "Fills form & signs", "Manager approves", "Leave recorded"],
  },
  {
    title: "CRM site visit",
    steps: ["CRM staff opens site link", "GPS captured at sign-in", "Work at site", "Sign out with GPS"],
  },
];

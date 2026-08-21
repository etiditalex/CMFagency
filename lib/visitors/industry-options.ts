/** Dashboard / marketing industry order (matches Smart Visitor Management page). */
export const VISITOR_INDUSTRIES = [
  { slug: "retail-hospitality", label: "Retail & Hospitality" },
  { slug: "health-aged-care", label: "Health & Aged Care" },
  { slug: "real-estate", label: "Real Estate" },
  { slug: "office-education", label: "Office & Education" },
  { slug: "sports", label: "Sports" },
  { slug: "tourism", label: "Tourism" },
] as const;

export type VisitorIndustrySlug = (typeof VISITOR_INDUSTRIES)[number]["slug"];

export function industryLabel(slug: string | null | undefined): string {
  if (!slug) return "—";
  return VISITOR_INDUSTRIES.find((i) => i.slug === slug)?.label ?? slug;
}

export function isVisitorIndustrySlug(slug: string): slug is VisitorIndustrySlug {
  return VISITOR_INDUSTRIES.some((i) => i.slug === slug);
}

export const VISITOR_MANAGEMENT_PATH = "/dashboard/visitor-management";
export const VISITOR_MANAGEMENT_ACCOUNTS_PATH = `${VISITOR_MANAGEMENT_PATH}/accounts`;
export const VISITOR_MANAGEMENT_EMPLOYEES_PATH = `${VISITOR_MANAGEMENT_PATH}/employees`;
export const VISITOR_MANAGEMENT_EMPLOYEES_GPS_PATH = `${VISITOR_MANAGEMENT_EMPLOYEES_PATH}/gps`;
export const VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_PATH = `${VISITOR_MANAGEMENT_EMPLOYEES_PATH}/summary-reports`;
export const VISITOR_MANAGEMENT_EMPLOYEES_PER_EMPLOYEE_REPORT_PATH = `${VISITOR_MANAGEMENT_EMPLOYEES_PATH}/per-employee-attendance-report`;
export const VISITOR_MANAGEMENT_EMPLOYEES_CRM_SITE_GPS_PATH = `${VISITOR_MANAGEMENT_EMPLOYEES_PATH}/crm-site-gps`;
export const VISITOR_MANAGEMENT_EMPLOYEES_KIOSK_PATH = `${VISITOR_MANAGEMENT_EMPLOYEES_PATH}/kiosk`;
export const VISITOR_MANAGEMENT_EMPLOYEES_BIOMETRIC_PATH = `${VISITOR_MANAGEMENT_EMPLOYEES_PATH}/biometric`;
export const VISITOR_MANAGEMENT_LEAVE_PATH = `${VISITOR_MANAGEMENT_PATH}/leave`;
export const VISITOR_MANAGEMENT_LEAVE_SETTINGS_PATH = `${VISITOR_MANAGEMENT_LEAVE_PATH}/settings`;
export const VISITOR_MANAGEMENT_VERIFICATION_PATH = `${VISITOR_MANAGEMENT_PATH}/verification`;
export const VISITOR_MANAGEMENT_HR_PAYROLL_API_PATH = `${VISITOR_MANAGEMENT_PATH}/hr-payroll-api`;
export const VISITOR_MANAGEMENT_DOCS_PATH = `${VISITOR_MANAGEMENT_PATH}/docs`;
export const CRM_SITE_CHECK_PATH = "/fusion-xpress/smart-visitor-management/crm-site-check";
export const BIOMETRIC_CHECK_PATH = "/fusion-xpress/smart-visitor-management/biometric-check";

/** Sidebar sub-pages under Employees (not the main employees list). */
export const VISITOR_MANAGEMENT_EMPLOYEES_NESTED_PATHS = [
  VISITOR_MANAGEMENT_EMPLOYEES_GPS_PATH,
  VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_PATH,
  VISITOR_MANAGEMENT_EMPLOYEES_PER_EMPLOYEE_REPORT_PATH,
  VISITOR_MANAGEMENT_EMPLOYEES_CRM_SITE_GPS_PATH,
  VISITOR_MANAGEMENT_EMPLOYEES_BIOMETRIC_PATH,
] as const;

export const VISITOR_MANAGEMENT_LEAVE_NESTED_PATHS = [VISITOR_MANAGEMENT_LEAVE_SETTINGS_PATH] as const;

export function isEmployeesNestedNavPath(pathname: string): boolean {
  return VISITOR_MANAGEMENT_EMPLOYEES_NESTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function isLeaveNestedNavPath(pathname: string): boolean {
  return VISITOR_MANAGEMENT_LEAVE_NESTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
export const VISITOR_MANAGEMENT_SUBSCRIPTION_PATH = `${VISITOR_MANAGEMENT_PATH}/subscription`;

export function industryCheckInPath(industrySlug: string, ownerId: string): string {
  const qs = new URLSearchParams({ owner: ownerId.trim() });
  return `/fusion-xpress/smart-visitor-management/demo/${encodeURIComponent(industrySlug)}?${qs.toString()}`;
}

export function industryCheckInUrl(
  industrySlug: string,
  ownerId: string,
  siteOrigin?: string
): string {
  const base = (siteOrigin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const path = industryCheckInPath(industrySlug, ownerId);
  return base ? `${base}${path}` : path;
}

export function visitorManagementHref(industrySlug?: string | null): string {
  if (!industrySlug || industrySlug === "all") return VISITOR_MANAGEMENT_PATH;
  return `${VISITOR_MANAGEMENT_PATH}?industry=${encodeURIComponent(industrySlug)}`;
}

export type VisitorManagementIndustryNavChild = {
  label: string;
  industrySlug: string;
};

export type VisitorManagementLinkNavChild = {
  label: string;
  href: string;
  adminOnly?: boolean;
  /** Nested visually under Employees in the Visitor Management sidebar. */
  underEmployees?: boolean;
  /** Nested visually under Leave in the Visitor Management sidebar. */
  underLeave?: boolean;
  /** Only shown when organisation industry is real-estate. */
  realEstateOnly?: boolean;
  /** Smart Visitor Management business accounts (and admins managing them). */
  businessAccountOnly?: boolean;
};

export type VisitorManagementNavChild =
  | VisitorManagementIndustryNavChild
  | VisitorManagementLinkNavChild;

export const VISITOR_MANAGEMENT_NAV_CHILDREN: VisitorManagementIndustryNavChild[] = [
  { label: "All industries", industrySlug: "all" as const },
  ...VISITOR_INDUSTRIES.map((i) => ({ label: i.label, industrySlug: i.slug })),
];

export const VISITOR_MANAGEMENT_ACCOUNTS_NAV_CHILD: VisitorManagementLinkNavChild = {
  label: "Accounts Manager",
  href: VISITOR_MANAGEMENT_ACCOUNTS_PATH,
  adminOnly: true,
};

export const VISITOR_MANAGEMENT_EMPLOYEES_NAV_CHILD: VisitorManagementLinkNavChild = {
  label: "Employees",
  href: VISITOR_MANAGEMENT_EMPLOYEES_PATH,
};

export const VISITOR_MANAGEMENT_EMPLOYEES_GPS_NAV_CHILD: VisitorManagementLinkNavChild = {
  label: "GPS tracking",
  href: VISITOR_MANAGEMENT_EMPLOYEES_GPS_PATH,
  underEmployees: true,
};

export const VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_NAV_CHILD: VisitorManagementLinkNavChild = {
  label: "Summary reports",
  href: VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_PATH,
  underEmployees: true,
};

export const VISITOR_MANAGEMENT_EMPLOYEES_PER_EMPLOYEE_REPORT_NAV_CHILD: VisitorManagementLinkNavChild = {
  label: "Per employee attendance report",
  href: VISITOR_MANAGEMENT_EMPLOYEES_PER_EMPLOYEE_REPORT_PATH,
  underEmployees: true,
};

export const VISITOR_MANAGEMENT_EMPLOYEES_CRM_SITE_GPS_NAV_CHILD: VisitorManagementLinkNavChild = {
  label: "CRM site GPS",
  href: VISITOR_MANAGEMENT_EMPLOYEES_CRM_SITE_GPS_PATH,
  underEmployees: true,
  realEstateOnly: true,
};

export const VISITOR_MANAGEMENT_EMPLOYEES_BIOMETRIC_NAV_CHILD: VisitorManagementLinkNavChild = {
  label: "Biometric fingerprint",
  href: VISITOR_MANAGEMENT_EMPLOYEES_BIOMETRIC_PATH,
  underEmployees: true,
};

export const VISITOR_MANAGEMENT_LEAVE_NAV_CHILD: VisitorManagementLinkNavChild = {
  label: "Leave",
  href: VISITOR_MANAGEMENT_LEAVE_PATH,
  businessAccountOnly: true,
};

export const VISITOR_MANAGEMENT_VERIFICATION_NAV_CHILD: VisitorManagementLinkNavChild = {
  label: "Verification",
  href: VISITOR_MANAGEMENT_VERIFICATION_PATH,
  businessAccountOnly: true,
};

export const VISITOR_MANAGEMENT_LEAVE_SETTINGS_NAV_CHILD: VisitorManagementLinkNavChild = {
  label: "Leave settings",
  href: VISITOR_MANAGEMENT_LEAVE_SETTINGS_PATH,
  underLeave: true,
  businessAccountOnly: true,
};

export const VISITOR_MANAGEMENT_HR_PAYROLL_API_NAV_CHILD: VisitorManagementLinkNavChild = {
  label: "HR & Payroll API",
  href: VISITOR_MANAGEMENT_HR_PAYROLL_API_PATH,
  businessAccountOnly: true,
};

export const VISITOR_MANAGEMENT_SUBSCRIPTION_NAV_CHILD: VisitorManagementLinkNavChild = {
  label: "Subscription",
  href: VISITOR_MANAGEMENT_SUBSCRIPTION_PATH,
};

export const VISITOR_MANAGEMENT_DOCS_NAV_CHILD: VisitorManagementLinkNavChild = {
  label: "Doc",
  href: VISITOR_MANAGEMENT_DOCS_PATH,
};

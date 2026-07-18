import {
  VISITOR_CHECKIN_TRIAL_LIMIT,
  VISITOR_PREREGISTER_TRIAL_LIMIT,
} from "@/lib/visitors/subscription";

/** Marketing comparison rows — aligned with `PLAN_FEATURES` in subscription.ts */
export type MarketingFeatureRow = {
  label: string;
  trial: string | boolean;
  professional: string | boolean;
  enterprise: string | boolean;
};

export const VISITOR_CHECKIN_MARKETING_ROWS: MarketingFeatureRow[] = [
  {
    label: "Contactless check-in via smart QR codes",
    trial: `Up to ${VISITOR_CHECKIN_TRIAL_LIMIT.toLocaleString()}`,
    professional: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    label: "Pre-register expected guests",
    trial: `Up to ${VISITOR_PREREGISTER_TRIAL_LIMIT}`,
    professional: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    label: "Automatically check out guests",
    trial: false,
    professional: true,
    enterprise: true,
  },
  {
    label: "Fast visitor record entry (copy & paste)",
    trial: false,
    professional: true,
    enterprise: true,
  },
  {
    label: "Visitor data export (CSV / PDF)",
    trial: true,
    professional: true,
    enterprise: true,
  },
  {
    label: "Group check-in (up to 5 people)",
    trial: true,
    professional: true,
    enterprise: true,
  },
];

export const VISITOR_EMPLOYEE_MARKETING_ROWS: MarketingFeatureRow[] = [
  {
    label: "Employee attendance module",
    trial: false,
    professional: true,
    enterprise: true,
  },
  {
    label: "Reception QR + phone-linked member ID",
    trial: false,
    professional: true,
    enterprise: true,
  },
  {
    label: "Biometric fingerprint attendance terminal",
    trial: false,
    professional: true,
    enterprise: true,
  },
  {
    label: "Download employee & reception QR (PDF)",
    trial: false,
    professional: true,
    enterprise: true,
  },
  {
    label: "Workplace GPS geofence (sign-in / sign-out)",
    trial: true,
    professional: true,
    enterprise: true,
  },
  {
    label: "Attendance summary reports, charts & rankings",
    trial: false,
    professional: true,
    enterprise: true,
  },
  {
    label: "Attendance Excel export",
    trial: false,
    professional: true,
    enterprise: true,
  },
  {
    label: "Email alerts to organisation directors",
    trial: false,
    professional: true,
    enterprise: true,
  },
];

/** Enterprise / Real Estate — requires Enterprise plan */
export const VISITOR_REAL_ESTATE_MARKETING_ROWS: MarketingFeatureRow[] = [
  {
    label: "Staff & CRM team profiles",
    trial: false,
    professional: false,
    enterprise: true,
  },
  {
    label: "Separate reporting windows (staff vs CRM)",
    trial: false,
    professional: false,
    enterprise: true,
  },
  {
    label: "Dedicated reception QR per team (staff / CRM)",
    trial: false,
    professional: false,
    enterprise: true,
  },
  {
    label: "CRM site GPS — live project visits & rankings",
    trial: false,
    professional: false,
    enterprise: true,
  },
  {
    label: "Late / on-time attendance labels per team",
    trial: false,
    professional: false,
    enterprise: true,
  },
  {
    label: "Priority support",
    trial: false,
    professional: false,
    enterprise: true,
  },
];

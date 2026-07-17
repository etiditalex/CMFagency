import {
  VISITOR_CHECKIN_MARKETING_ROWS,
  VISITOR_EMPLOYEE_MARKETING_ROWS,
  VISITOR_REAL_ESTATE_MARKETING_ROWS,
  type MarketingFeatureRow,
} from "@/lib/visitors/subscription-marketing-features";
import type { PaidVisitorPlan } from "@/lib/visitors/subscription-pricing";

function featureIncluded(row: MarketingFeatureRow, plan: PaidVisitorPlan): boolean {
  const v = row[plan];
  if (typeof v === "boolean") return v;
  return Boolean(v && String(v).trim());
}

function featureLabel(row: MarketingFeatureRow, plan: PaidVisitorPlan): string {
  const v = row[plan];
  if (typeof v === "string" && v.trim() && v !== "Unlimited") {
    return `${row.label} (${v})`;
  }
  if (v === "Unlimited") {
    return `${row.label} — Unlimited`;
  }
  return row.label;
}

/** Feature lines included on a Smart Management Invoice for the selected package. */
export function getSmartManagementInvoiceFeatures(plan: PaidVisitorPlan): string[] {
  const rows = [
    ...VISITOR_CHECKIN_MARKETING_ROWS,
    ...VISITOR_EMPLOYEE_MARKETING_ROWS,
    ...(plan === "enterprise" ? VISITOR_REAL_ESTATE_MARKETING_ROWS : []),
  ];
  return rows.filter((row) => featureIncluded(row, plan)).map((row) => featureLabel(row, plan));
}

export function smartManagementPackageLabel(plan: PaidVisitorPlan): string {
  return plan === "enterprise" ? "Enterprise" : "Professional";
}

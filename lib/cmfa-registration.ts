export const CMFA_EVENT_SLUG = "coast-fashion-modelling-awards-2026";

export const CMFA_DESIGNATIONS = [
  { value: "cmf_executive", label: "CMF Executive member" },
  { value: "high_fashion_model", label: "High Fashion Model" },
  { value: "award_contestant", label: "Award Contestant" },
  { value: "sponsor_partner", label: "Sponsor/partner" },
] as const;

export type CmfaDesignation = (typeof CMFA_DESIGNATIONS)[number]["value"];

export type CmfaRegistrationStatus = "pending" | "approved" | "rejected";

export function isCmfaDesignation(value: string): value is CmfaDesignation {
  return CMFA_DESIGNATIONS.some((d) => d.value === value);
}

export function cmfaDesignationLabel(value: string): string {
  return CMFA_DESIGNATIONS.find((d) => d.value === value)?.label ?? value;
}

export function cmfaStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending approval";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

export function cmfaTicketId(reference: string): string {
  return `CMFA-${reference.replace(/^cmfa_reg_/, "").replace(/-/g, "").slice(-10).toUpperCase()}`;
}

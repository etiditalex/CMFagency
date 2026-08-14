export const CMFA_EVENT_SLUG = "coast-fashion-modelling-awards-2026";

export const CMFA_DESIGNATIONS = [
  { value: "cmf_executive", label: "CMF Executive member" },
  { value: "high_fashion_model", label: "High Fashion Model" },
  { value: "award_contestant", label: "Award Contestant" },
  { value: "sponsor_partner", label: "Sponsor/partner" },
  { value: "entertainment", label: "Entertainment" },
  { value: "kpc_student", label: "KPC student" },
  { value: "guest", label: "Guests" },
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

/** Complimentary ticket color chosen at gate approval. Does not change already-sent tickets. */
export const CMFA_COMPLIMENTARY_TICKET_TIERS = [
  { value: "regular", label: "Complimentary Regular", shortLabel: "Regular", color: "#059669" },
  { value: "vip", label: "VIP", shortLabel: "VIP", color: "#2563eb" },
  { value: "vvip", label: "VVIP", shortLabel: "VVIP", color: "#B8860B" },
] as const;

export type CmfaComplimentaryTicketTier = (typeof CMFA_COMPLIMENTARY_TICKET_TIERS)[number]["value"];

export function isCmfaComplimentaryTicketTier(value: string): value is CmfaComplimentaryTicketTier {
  return CMFA_COMPLIMENTARY_TICKET_TIERS.some((t) => t.value === value);
}

export function cmfaComplimentaryTicketTierLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return CMFA_COMPLIMENTARY_TICKET_TIERS.find((t) => t.value === value)?.label ?? value;
}

export function defaultCmfaTicketTier(designation: string): CmfaComplimentaryTicketTier {
  return designation.trim().toLowerCase() === "guest" ? "vip" : "regular";
}

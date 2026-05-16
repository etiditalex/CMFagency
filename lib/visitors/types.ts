/** Visitor record — structured for future Supabase/API integration. */
export type VisitorStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "checked_in"
  | "checked_out";

export type VisitorRecord = {
  id: string;
  fullName: string;
  phoneNumber: string;
  idPassportNumber: string;
  vehiclePlateNumber: string;
  host: string;
  purposeOfVisit: string;
  visitDate: string;
  visitTime: string;
  status: VisitorStatus;
  /** Set when status becomes approved */
  qrCodeToken: string | null;
  industrySlug?: string | null;
  source?: string;
  formExtra?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type VisitorDemoSubmission = {
  id: string;
  industrySlug: string;
  fullName: string | null;
  phoneNumber: string | null;
  email: string | null;
  formPayload: Record<string, unknown>;
  createdAt: string;
};

export type VisitorFormInput = {
  fullName: string;
  phoneNumber: string;
  idPassportNumber: string;
  vehiclePlateNumber: string;
  host: string;
  purposeOfVisit: string;
  visitDate: string;
  visitTime: string;
};

/** Private Supabase Storage bucket for job application uploads (create via SQL patch or Dashboard). */
export const APPLICATION_DOCS_BUCKET = "application-documents";

export type ClientFileValidation = {
  isValid?: boolean;
  warnings?: string[];
  error?: string;
};

export type SubmissionMeta = {
  submitted_via: "web_application_portal";
  submitted_at: string;
  documents_complete: boolean;
  required_present: {
    id_front: boolean;
    id_back: boolean;
    cv: boolean;
  };
  client_validation: Record<string, ClientFileValidation | undefined>;
  /** High-level hint for dashboard filtering (not a final hiring decision). */
  qualification_hint:
    | "incomplete_documents"
    | "client_validation_failed"
    | "pending_review_with_warnings"
    | "pending_review";
  /** Set on server: role matched `lib/job-openings` catalog. */
  job_opening_match?: "listed" | "none";
  job_opening_id?: string;
};

export function buildSubmissionMeta(
  present: {
    idFront: boolean;
    idBack: boolean;
    passportPhoto: boolean;
    certificateOfGoodConduct: boolean;
    cv: boolean;
  },
  validations: Record<string, ClientFileValidation | undefined>
): SubmissionMeta {
  const documents_complete = !!(present.idFront && present.idBack && present.cv);
  const keys = ["idFront", "idBack", "passportPhoto", "certificateOfGoodConduct", "cv"] as const;
  let anyInvalid = false;
  let anyWarning = false;
  for (const key of keys) {
    if (!present[key]) continue;
    const v = validations[key];
    if (v?.isValid === false) anyInvalid = true;
    if (v?.warnings && v.warnings.length > 0) anyWarning = true;
  }

  let qualification_hint: SubmissionMeta["qualification_hint"];
  if (!documents_complete) qualification_hint = "incomplete_documents";
  else if (anyInvalid) qualification_hint = "client_validation_failed";
  else if (anyWarning) qualification_hint = "pending_review_with_warnings";
  else qualification_hint = "pending_review";

  return {
    submitted_via: "web_application_portal",
    submitted_at: new Date().toISOString(),
    documents_complete,
    required_present: {
      id_front: present.idFront,
      id_back: present.idBack,
      cv: present.cv,
    },
    client_validation: validations,
    qualification_hint,
  };
}

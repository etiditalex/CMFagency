export const FORM_FIELD_TYPES = ["text", "email", "phone", "textarea", "select", "checkbox"] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export type FusionFormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder: string;
  options: string[];
};

export type StoredFormAnswer = {
  id: string;
  label: string;
  value: string;
};

export const FORM_CATEGORIES = ["General", "Events", "Registration", "Volunteer", "Membership", "Other"] as const;

export const FORM_SUBMISSION_STATUSES = ["new", "reviewed", "shortlisted", "rejected"] as const;
export type FormSubmissionStatus = (typeof FORM_SUBMISSION_STATUSES)[number];

const FIELD_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_FIELDS = 30;
const MAX_OPTIONS = 20;

export function slugifyFormTitle(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function newFieldId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function defaultFormFields(): FusionFormField[] {
  return [
    { id: "full-name", label: "Full name", type: "text", required: true, placeholder: "", options: [] },
    { id: "email", label: "Email", type: "email", required: true, placeholder: "", options: [] },
    { id: "phone", label: "Phone", type: "phone", required: false, placeholder: "", options: [] },
  ];
}

export function isFormFieldType(value: string): value is FormFieldType {
  return (FORM_FIELD_TYPES as readonly string[]).includes(value);
}

export function isFormSubmissionStatus(value: string): value is FormSubmissionStatus {
  return (FORM_SUBMISSION_STATUSES as readonly string[]).includes(value);
}

export function formStatusLabel(status: FormSubmissionStatus): string {
  if (status === "new") return "New";
  if (status === "reviewed") return "Reviewed";
  if (status === "shortlisted") return "Shortlisted";
  return "Rejected";
}

export function fieldTypeLabel(type: FormFieldType): string {
  if (type === "text") return "Short text";
  if (type === "email") return "Email";
  if (type === "phone") return "Phone";
  if (type === "textarea") return "Long text";
  if (type === "select") return "Dropdown";
  return "Checkbox";
}

export function isPlausibleFormPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

export function isPlausibleFormEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseFormFields(value: unknown): FusionFormField[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const fields: FusionFormField[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim().toLowerCase() : "";
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const type = typeof row.type === "string" && isFormFieldType(row.type) ? row.type : null;
    if (!id || !FIELD_ID_RE.test(id) || id.length > 40 || !label || !type || seen.has(id)) continue;
    seen.add(id);
    const options =
      type === "select" && Array.isArray(row.options)
        ? row.options
            .map((option) => (typeof option === "string" ? option.trim() : ""))
            .filter(Boolean)
            .slice(0, MAX_OPTIONS)
        : [];
    fields.push({
      id,
      label: label.slice(0, 120),
      type,
      required: row.required === true,
      placeholder: typeof row.placeholder === "string" ? row.placeholder.trim().slice(0, 160) : "",
      options,
    });
    if (fields.length >= MAX_FIELDS) break;
  }
  return fields;
}

export function parseStoredAnswers(value: unknown): StoredFormAnswer[] {
  if (!Array.isArray(value)) return [];
  const answers: StoredFormAnswer[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!label) continue;
    answers.push({
      id: typeof row.id === "string" ? row.id : "",
      label: label.slice(0, 120),
      value: typeof row.value === "string" ? row.value : "",
    });
  }
  return answers;
}

export function formatFormDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

export function formatFormSubmittedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function makeFormSubmissionCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let body = "";
  for (const byte of bytes) body += alphabet[byte % alphabet.length];
  return `CFF-${body}`;
}

export const STARTER_FORM_SLUGS = ["registration", "volunteers"] as const;

export type StarterForm = {
  slug: (typeof STARTER_FORM_SLUGS)[number];
  title: string;
  excerpt: string;
  intro: string;
  category: string;
  imageUrl: string;
  linkHref: string;
};

/** Registration and Volunteers, the first forms on the public page and in the dashboard. */
export const STARTER_FORMS: readonly StarterForm[] = [
  {
    slug: "registration",
    title: "Registration",
    excerpt:
      "Apply for Kenya’s Ideal Mr & Miss 2026. Theme: Models for Education. 12 December 2026 at Malaika Lounge, Malindi.",
    intro:
      "Contestant application for Kenya’s Ideal Mr & Miss 2026. The card on the Forms page opens this application.",
    category: "Registration",
    imageUrl: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg",
    linkHref: "/events/registration",
  },
  {
    slug: "volunteers",
    title: "Volunteers",
    excerpt:
      "Apply to volunteer as a Regional or County Representative for the Kenya Fashion and Creative Arts Awards, organised by Changer Fusions.",
    intro:
      "Regional and county representative application for the Kenya Fashion and Creative Arts Awards. The card on the Forms page opens this application.",
    category: "Volunteer",
    imageUrl: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition202512_uju1mf.jpg",
    linkHref: "/events/volunteers",
  },
];

export function isStarterFormSlug(slug: string): boolean {
  return (STARTER_FORM_SLUGS as readonly string[]).includes(slug);
}

export function starterFormBySlug(slug: string): StarterForm | null {
  return STARTER_FORMS.find((form) => form.slug === slug) ?? null;
}

export const FORMS_SETUP_SQL =
  "database/ticketing_voting_mvp_patch_104_fusion_forms.sql, then database/ticketing_voting_mvp_patch_105_fusion_forms_starters.sql";

export function formsTableMissingMessage(error: string): string | null {
  const missing =
    error.includes("does not exist") ||
    error.includes("42P01") ||
    error.includes("schema cache");
  if (!missing) return null;
  return `Forms are not set up yet. Run ${FORMS_SETUP_SQL} in the Supabase SQL editor.`;
}

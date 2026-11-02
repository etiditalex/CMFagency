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

export type FusionFormBlock = {
  id: string;
  heading: string;
  body: string;
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

const MAX_BLOCKS = 20;

export function parseFormContent(value: unknown): FusionFormBlock[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const blocks: FusionFormBlock[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const heading = typeof row.heading === "string" ? row.heading.trim().slice(0, 120) : "";
    const body = typeof row.body === "string" ? row.body.trim().slice(0, 4000) : "";
    if (!heading && !body) continue;
    let id = typeof row.id === "string" ? row.id.trim().toLowerCase() : "";
    if (!id || !FIELD_ID_RE.test(id) || id.length > 40 || seen.has(id)) id = newFieldId();
    seen.add(id);
    blocks.push({ id, heading, body });
    if (blocks.length >= MAX_BLOCKS) break;
  }
  return blocks;
}

export function splitIntroBlock(blocks: FusionFormBlock[]) {
  const index = blocks.findIndex((block) => !block.heading.trim());
  if (index === -1) return { intro: null as FusionFormBlock | null, sections: blocks };
  return {
    intro: blocks[index],
    sections: blocks.filter((_, itemIndex) => itemIndex !== index),
  };
}

export function withFeeLabel(body: string, feeLabel: string) {
  return body.replaceAll("{fee}", feeLabel);
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

const VOLUNTEER_DEFAULT_CONTENT: readonly FusionFormBlock[] = [
  {
    id: "intro",
    heading: "",
    body: "Changer Fusions, organizers of the Kenya Fashion and Creative Arts Awards, invites passionate, committed, and proactive individuals to volunteer as Regional Representatives and County Representatives across Kenya.",
  },
  {
    id: "responsibilities",
    heading: "Key responsibilities",
    body: [
      "Promote KFCAA activities and official announcements.",
      "Engage and mobilise creatives within assigned areas.",
      "Build networks with creative organisations, institutions, brands, and media.",
      "Identify emerging talent and partnership opportunities.",
      "Support local promotional activities and events.",
      "Submit regular updates to the organising team.",
    ].join("\n"),
  },
  {
    id: "who-can-apply",
    heading: "Who can apply?",
    body: [
      "Individuals with strong communication, networking, leadership, and organizational skills, a good understanding of their local communities, and a genuine interest in Kenya's creative industry.",
      "We welcome people passionate about fashion, modelling, design, photography, film, music, visual arts, and the wider creative industry.",
      "This is a volunteer opportunity offering valuable experience, professional networking, and an opportunity to contribute to the growth of Kenya's creative sector.",
    ].join("\n\n"),
  },
];

const REGISTRATION_DEFAULT_CONTENT: readonly FusionFormBlock[] = [
  {
    id: "welcome",
    heading: "",
    body: "Welcome to the contestant application for Kenya’s Ideal Mr & Miss 2026. The theme is Models for Education. The event is on 12 December 2026 at Malaika Lounge, Malindi, and the registration fee is {fee}. Submit this form so Changer Fusions can review the entry.",
  },
];

/** Copy shown until an admin saves their own sections for that form. */
export function starterDefaultContent(slug: string): FusionFormBlock[] {
  const source =
    slug === "volunteers" ? VOLUNTEER_DEFAULT_CONTENT : slug === "registration" ? REGISTRATION_DEFAULT_CONTENT : [];
  return source.map((block) => ({ ...block }));
}

export const FORM_CONTENT_SETUP_SQL = "database/ticketing_voting_mvp_patch_106_fusion_forms_content.sql";

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

import { getIndustryDemo } from "@/lib/visitors/industry-demos";

function pickStr(values: Record<string, unknown>, keys: string[], max: number): string {
  for (const k of keys) {
    const v = values[k];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, max);
  }
  return "";
}

function pickTimeNow(): string {
  const t = new Date();
  return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}:00`;
}

function pickDate(values: Record<string, unknown>): string {
  const keys = ["visitDate", "viewingDate", "checkInDate", "checkOutDate"];
  for (const k of keys) {
    const v = values[k];
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();
  }
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function pickPurpose(industrySlug: string, values: Record<string, unknown>): string {
  const direct = pickStr(values, ["purpose", "purposeOfVisit", "visitType", "eventName"], 500);
  if (direct) return direct;

  const labels: Record<string, string> = {
    "retail-hospitality": "Guest visit",
    "health-aged-care": "Patient / visitor registration",
    "real-estate": "Property viewing",
    "office-education": "Office / campus visit",
    sports: "Sports facility visit",
    tourism: "Tourism guest registration",
  };
  return labels[industrySlug] ?? "Visitor registration";
}

function pickHost(values: Record<string, unknown>): string {
  const host = pickStr(values, ["host", "agentName"], 200);
  return host || "Reception";
}

export type MappedIndustryVisitor = {
  full_name: string;
  phone_number: string;
  id_passport_number: string;
  vehicle_plate_number: string;
  host: string;
  purpose_of_visit: string;
  visit_date: string;
  visit_time: string;
  industry_slug: string;
  form_extra: Record<string, unknown>;
};

export function mapIndustryFormToVisitor(
  industrySlug: string,
  rawValues: Record<string, unknown>
): { row: MappedIndustryVisitor } | { error: string } {
  const demo = getIndustryDemo(industrySlug);
  if (!demo) return { error: "Invalid industry" };

  const values: Record<string, unknown> = { ...rawValues };

  for (const section of demo.sections) {
    for (const field of section.fields) {
      if (!field.required) continue;
      const v = values[field.name];
      if (field.type === "checkbox-group") {
        if (!Array.isArray(v) || v.length === 0) {
          return { error: `${field.label} is required.` };
        }
      } else if (typeof v !== "string" || !v.trim()) {
        return { error: `${field.label} is required.` };
      }
    }
  }

  const full_name = pickStr(values, ["fullName", "full_name"], 200);
  const phone_number = pickStr(values, ["phone", "phoneNumber", "phone_number"], 40);
  if (!full_name) return { error: "Full name is required." };
  if (!phone_number) return { error: "Contact number is required." };

  const id_passport_number = pickStr(
    values,
    ["idNumber", "idPassport", "idPassportNumber", "medicareNumber"],
    80
  );
  const vehicle_plate_number = pickStr(values, ["vehiclePlate", "vehiclePlateNumber"], 32);

  return {
    row: {
      full_name,
      phone_number,
      id_passport_number,
      vehicle_plate_number,
      host: pickHost(values),
      purpose_of_visit: pickPurpose(industrySlug, values),
      visit_date: pickDate(values),
      visit_time: pickTimeNow(),
      industry_slug: industrySlug,
      form_extra: values,
    },
  };
}

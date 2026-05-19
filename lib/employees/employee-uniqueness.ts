import type { SupabaseClient } from "@supabase/supabase-js";

function normalizeEmail(email: string | null | undefined): string {
  return String(email ?? "").trim().toLowerCase();
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Reject duplicate email or full name within the same organisation. */
export async function findEmployeeDuplicate(
  admin: SupabaseClient,
  ownerId: string,
  params: {
    email?: string | null;
    fullName: string;
    excludeEmployeeId?: string;
  }
): Promise<{ field: "email" | "fullName"; message: string } | null> {
  const emailNorm = normalizeEmail(params.email);
  const nameNorm = normalizeName(params.fullName);
  if (!nameNorm) return null;

  let q = admin
    .from("visitor_employees")
    .select("id,full_name,email")
    .eq("owner_id", ownerId)
    .limit(500);

  if (params.excludeEmployeeId) {
    q = q.neq("id", params.excludeEmployeeId);
  }

  const { data, error } = await q;
  if (error) return null;

  for (const row of data ?? []) {
    const id = String(row.id ?? "");
    if (params.excludeEmployeeId && id === params.excludeEmployeeId) continue;

    if (emailNorm) {
      const existingEmail = normalizeEmail(row.email as string | null);
      if (existingEmail && existingEmail === emailNorm) {
        return {
          field: "email",
          message: "An employee with this email already exists in your organisation.",
        };
      }
    }

    const existingName = normalizeName(String(row.full_name ?? ""));
    if (existingName === nameNorm) {
      return {
        field: "fullName",
        message: "An employee with this full name already exists. Use a unique name or add a department suffix.",
      };
    }
  }

  return null;
}

import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AccountService = "poll" | "visitor_management" | "employer";

const SERVICE_FEATURE: Record<AccountService, string> = {
  poll: "poll_account",
  visitor_management: "visitor_management",
  employer: "employer_account",
};

export function isDuplicateAuthError(message: string): boolean {
  return /already|registered|exists/i.test(message);
}

export async function findAuthUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users ?? [];
    const found = users.find((user) => (user.email ?? "").toLowerCase() === target);
    if (found) return found;
    if (users.length < 200) return null;
  }
  return null;
}

function memberHasService(role: string, features: string[], service: AccountService): boolean {
  if (service === "poll") return role === "poll" || features.includes("poll_account");
  if (service === "employer") return role === "employer" || features.includes("employer_account");
  return features.includes("visitor_management");
}

export type AttachAccountResult =
  | { ok: true; userId: string; emailConfirmed: boolean }
  | { ok: false; status: number; error: string };

/**
 * Adds a service onto the auth user that already owns this email.
 * The stored password is left unchanged, so the person signs in with the password they already use.
 */
export async function attachAccountService(
  admin: SupabaseClient,
  email: string,
  _password: string,
  service: AccountService,
  metadataPatch: Record<string, unknown> = {}
): Promise<AttachAccountResult> {
  const user = await findAuthUserByEmail(admin, email);
  if (!user?.id) {
    return { ok: false, status: 400, error: "An account with this email already exists. Sign in instead." };
  }

  const { data: member, error: readErr } = await admin
    .from("portal_members")
    .select("role, features")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readErr) return { ok: false, status: 500, error: readErr.message };

  const role = String(member?.role ?? "").toLowerCase();
  const features = Array.isArray(member?.features) ? member.features.map((feature) => String(feature)) : [];
  if (member && memberHasService(role, features, service)) {
    return { ok: false, status: 400, error: "This email is already signed up for this service. Sign in instead." };
  }

  const nextFeature = SERVICE_FEATURE[service];
  if (!member) {
    const insertRole = service === "poll" ? "poll" : service === "employer" ? "employer" : "client";
    const { error } = await admin.from("portal_members").insert({
      user_id: user.id,
      role: insertRole,
      tier: "basic",
      features: [nextFeature],
    });
    if (error) return { ok: false, status: 500, error: error.message || "Could not add this service." };
  } else {
    const nextFeatures = Array.from(new Set([...features, nextFeature]));
    const { error } = await admin.from("portal_members").update({ features: nextFeatures }).eq("user_id", user.id);
    if (error) return { ok: false, status: 500, error: error.message || "Could not add this service." };
  }

  const meta = { ...((user.user_metadata ?? {}) as Record<string, unknown>) };
  const services = Array.isArray(meta.account_services) ? meta.account_services.map(String) : [];
  const currentType = String(meta.account_type ?? "");
  if (currentType && !services.includes(currentType)) services.push(currentType);
  if (!services.includes(service)) services.push(service);
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadataPatch)) {
    if (meta[key] == null || meta[key] === "") patch[key] = value;
  }
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...meta, ...patch, account_services: services },
  });

  return { ok: true, userId: user.id, emailConfirmed: Boolean(user.email_confirmed_at) };
}

import { createClient } from "@supabase/supabase-js";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Returns true if this email was already on the list before insert. */
export async function insertNewsletterSubscriberIfNew(email: string): Promise<{
  ok: boolean;
  alreadySubscribed: boolean;
  error?: string;
}> {
  const normalized = email.trim().toLowerCase();
  const admin = adminClient();
  if (!admin) {
    return { ok: false, alreadySubscribed: false, error: "Server storage not configured" };
  }

  const { data: existing, error: selErr } = await admin
    .from("fusion_newsletter_subscribers")
    .select("email")
    .eq("email", normalized)
    .maybeSingle();

  if (selErr) {
    return { ok: false, alreadySubscribed: false, error: selErr.message };
  }
  if (existing?.email) {
    return { ok: true, alreadySubscribed: true };
  }

  const { error: insErr } = await admin.from("fusion_newsletter_subscribers").insert({ email: normalized });
  if (insErr) {
    return { ok: false, alreadySubscribed: false, error: insErr.message };
  }
  return { ok: true, alreadySubscribed: false };
}

export async function deleteNewsletterSubscriber(email: string): Promise<void> {
  const admin = adminClient();
  if (!admin) return;
  const normalized = email.trim().toLowerCase();
  await admin.from("fusion_newsletter_subscribers").delete().eq("email", normalized);
}

export async function listNewsletterSubscriberEmails(): Promise<{ ok: true; emails: string[] } | { ok: false; error: string }> {
  const admin = adminClient();
  if (!admin) {
    return { ok: false, error: "Server storage not configured" };
  }
  const { data, error } = await admin.from("fusion_newsletter_subscribers").select("email");
  if (error) {
    return { ok: false, error: error.message };
  }
  const emails = (data ?? []).map((r: { email: string }) => r.email).filter(Boolean);
  return { ok: true, emails };
}

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load .env.local so NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are available
config({ path: ".env.local" });

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const val = argv[i + 1];
    if (!val || val.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = val;
      i += 1;
    }
  }
  return args;
}

async function findUserByEmail(admin, email) {
  // Supabase admin API does not provide "get by email" directly, so we page through users.
  // This is fine for typical small projects.
  const perPage = 200;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    const match = users.find((u) => String(u.email ?? "").toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (users.length < perPage) return null;
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv);

  const email = String(args.email ?? "").trim().toLowerCase();
  const password = String(args.password ?? "");
  const r = String(args.role ?? "admin").trim().toLowerCase();
  const role = r === "client" ? "client" : r === "manager" ? "manager" : "admin";

  if (!email) throw new Error("Missing --email");
  if (!password || password.length < 6) throw new Error("Missing/invalid --password (min 6 chars)");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing env vars NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let user = await findUserByEmail(admin, email);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    if (!user?.id) throw new Error("Created user but missing id");
    console.log(`Created auth user: ${email} (${user.id})`);
  } else {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`Updated auth user password/confirmation: ${email} (${data.user?.id ?? user.id})`);
  }

  // Ensure portal membership (tier: admins/managers get enterprise, clients get basic by default).
  const tier = role === "admin" || role === "manager" ? "enterprise" : "basic";
  const { error: pmErr } = await admin.from("portal_members").upsert({ user_id: user.id, role, tier });
  if (pmErr) throw pmErr;
  console.log(`Upserted portal membership: role=${role}`);

  // Keep legacy allowlist in sync for full admins only.
  if (role === "admin") {
    const { error: auErr } = await admin.from("admin_users").insert({ user_id: user.id });
    if (auErr && String(auErr.code ?? "") !== "23505") throw auErr;
    console.log("Ensured legacy admin_users row");
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});


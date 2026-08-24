import { createClient } from "@supabase/supabase-js";

import { httpOnlyCookieStorage, purgeLegacyAuthLocalStorage } from "@/lib/auth/cookie-storage";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL and Anon Key must be set in environment variables");
}

if (typeof window !== "undefined") {
  purgeLegacyAuthLocalStorage();
}

/**
 * Browser sessions persist via httpOnly cookies (`/api/auth/session-store`), not localStorage.
 * Passwords are never stored here; Supabase Auth hashes them with bcrypt.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? httpOnlyCookieStorage : undefined,
  },
});

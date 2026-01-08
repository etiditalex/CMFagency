import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL and Anon Key must be set in environment variables');
}

// Create Supabase client with session persistence enabled
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Enable session persistence (default is true)
    autoRefreshToken: true, // Automatically refresh tokens
    detectSessionInUrl: true, // Detect session in URL for OAuth flows
    storage: typeof window !== 'undefined' ? window.localStorage : undefined, // Use localStorage for session storage
  },
});




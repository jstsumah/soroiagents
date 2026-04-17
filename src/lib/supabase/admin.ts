import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the SERVICE_ROLE_KEY.
 * This client bypasses RLS and can perform administrative actions.
 * ONLY use this in server-side code (API routes, Server Actions).
 */
export const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase Admin configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

/**
 * Lazy-initialized Supabase client using @supabase/ssr.
 * This ensures that on the client, cookies are handled correctly for SSR compatibility.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    if (!_supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        throw new Error(
          "Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables."
        );
      }
      _supabase = createBrowserClient(url, key, {
        cookieOptions: {
          sameSite: 'none',
          secure: true,
        }
      });
    }
    return Reflect.get(_supabase, prop, receiver);
  },
});

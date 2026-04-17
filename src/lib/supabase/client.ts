import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.error('Supabase environment variables are missing');
      return null as any;
    }

    client = createBrowserClient(
      url,
      key,
      {
        cookieOptions: {
          sameSite: 'none',
          secure: true,
        }
      }
    )
  }
  return client
}

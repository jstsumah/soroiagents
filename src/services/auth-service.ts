'use server';

import { createClient } from '@/lib/supabase/server';
import { getUser } from './user-service';
import type { User } from '@/lib/types';

export const getAuthenticatedUser = async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data: { user: authUser }, error } = await supabase.auth.getUser();
  
  if (error) {
    // AuthSessionMissingError is expected when not logged in, don't log it as an error
    if (error.name === 'AuthSessionMissingError' || error.message?.includes('Auth session missing')) {
      return null;
    }
    console.error('getAuthenticatedUser: Supabase auth error:', error);
    return null;
  }

  if (!authUser) {
    console.warn('getAuthenticatedUser: No auth user found in session.');
    return null;
  }

  return await getUser(authUser.id);
};

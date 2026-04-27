'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from './user-service';
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

  return await getUserProfile(authUser.id);
};

export const isAdmin = async (user: User | null): Promise<boolean> => {
  if (!user) return false;
  return user.role === 'Admin' || user.role === 'Super Admin';
};

export const ensureAdmin = async (): Promise<User> => {
  const user = await getAuthenticatedUser();
  if (!user || !(await isAdmin(user))) {
    throw new Error('Unauthorized: Admin access required');
  }
  return user;
};

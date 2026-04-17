

import { getUser } from '@/services/user-service';
import { notFound } from 'next/navigation';
import { UserProfileClient } from './user-profile-client';
import type { User } from '@/lib/types';


export default async function UserProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const user: User | null = await getUser(uid);
  
  if (!user) {
    notFound();
  }
  
  // This is no longer needed as we get the authUser from the context hook
  const viewingUser = null;

  return <UserProfileClient user={user} viewingUser={viewingUser} />;
}


"use client";

import { AddPropertyForm } from './add-property-form';
import { useAuth } from '@/app/app/app-provider';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Loader2 } from 'lucide-react';

export default function AddPropertyPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && user && !(user.role === 'Admin' || user.role === 'Super Admin')) {
      router.replace('/app/admin/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || !(user.role === 'Admin' || user.role === 'Super Admin')) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <AddPropertyForm />;
}

    
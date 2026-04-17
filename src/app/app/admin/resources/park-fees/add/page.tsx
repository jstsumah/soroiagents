
"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { ParkFeeForm } from "./park-fee-form";
import type { UserType } from '@/lib/types';
import { Suspense, useEffect } from 'react';
import { useAuth } from '@/app/app/app-provider';
import * as React from 'react';
import { Loader2 } from 'lucide-react';


function AddParkFeeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const type = searchParams.get('type') as UserType | null;

  useEffect(() => {
    if (!isLoading && user && user.role === 'Agent') {
      router.replace('/app/agent/dashboard');
    }
  }, [user, isLoading, router]);


  if (isLoading || !user) {
      return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
  }

  if (!type) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-destructive">Error: User type parameter is missing.</p>
      </div>
    );
  }

  const title = type === 'local' ? "Resident Park Fee" : "Non-Resident Park Fee";
  const description = type === 'local' ? "Add a new resident park fee entry in KES." : "Add a new non-resident park fee entry in USD.";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New {title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <ParkFeeForm userType={type} />
    </div>
  );
}


export default function AddParkFeePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
            <AddParkFeeContent />
        </Suspense>
    )
}

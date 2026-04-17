
"use client";

import { SignUpForm } from '@/components/auth/signup-form';
import { getCompanyDetails } from '@/services/settings-service';
import type { CompanyDetails } from '@/lib/types';
import { UserPlus } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SignUpPage() {
  const [companyDetails, setCompanyDetails] = React.useState<CompanyDetails | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const details = await getCompanyDetails();
        setCompanyDetails(details);
      } catch (error) {
        console.error("Failed to fetch company details:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, []);

  const companyName = companyDetails?.companyName || 'Tiered Access Hub';
  const loginBgUrl = companyDetails?.loginBgUrl;
  const loginBgType = companyDetails?.loginBgType || 'image';
  const loginBgColor = companyDetails?.loginBgColor || '#FFFFFF';

  const bgStyle = loginBgType === 'image' && loginBgUrl 
    ? { backgroundImage: `url(${loginBgUrl})` }
    : { backgroundColor: loginBgColor };

  return (
    <div 
      className="flex h-screen overflow-y-auto items-center justify-center bg-background p-4 bg-cover bg-center"
      style={bgStyle}
    >
       {loginBgType === 'image' && <div className="absolute inset-0 bg-black/50 z-0"></div>}
      <div className="relative z-10 w-full max-w-md rounded-lg border bg-card/90 p-8 shadow-md">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 mb-4 rounded-full bg-primary text-primary-foreground shadow-md">
            <UserPlus className="h-8 w-8" />
          </div>
           {isLoading ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <h1 className="text-2xl font-bold text-center text-foreground">{companyName}</h1>
          )}
          <p className="text-muted-foreground text-center mt-2">
            Join the Tiered Access Hub to access exclusive resources.
          </p>
        </div>
        <SignUpForm />
        <div className="mt-6 text-center text-base text-muted-foreground">
            Already have an account?{' '}
            <Link href="/" className="font-semibold text-primary hover:underline">
                Sign In
            </Link>
        </div>
      </div>
    </div>
  );
}

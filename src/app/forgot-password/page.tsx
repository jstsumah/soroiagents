"use client";

import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { KeyRound, Loader2 } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { getCompanyDetails } from '@/services/settings-service';
import type { CompanyDetails } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function ForgotPasswordPage() {
  const [companyDetails, setCompanyDetails] = React.useState<CompanyDetails | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchDetails = async () => {
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

  const loginBgUrl = companyDetails?.loginBgUrl;
  const loginBgType = companyDetails?.loginBgType || 'image';
  const loginBgColor = companyDetails?.loginBgColor || '#FFFFFF';

  const bgStyle = loginBgType === 'image' && loginBgUrl 
    ? { backgroundImage: `url('${loginBgUrl}')` }
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
            <KeyRound className="h-8 w-8" />
          </div>
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-5 w-72" />
                <Skeleton className="h-5 w-56" />
            </div>
          ) : (
            <>
                <h1 className="text-3xl font-bold text-center text-foreground">Reset Your Password</h1>
                <p className="text-muted-foreground text-center mt-2">
                    Enter your email and we&apos;ll send you a link to get back into your account.
                </p>
            </>
          )}
        </div>
        <ForgotPasswordForm />
        <div className="mt-6 text-center text-base text-muted-foreground">
            Remember your password?{' '}
            <Link href="/" className="font-semibold text-primary hover:underline">
                Sign In
            </Link>
        </div>
      </div>
    </div>
  );
}

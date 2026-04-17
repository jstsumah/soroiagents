
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-md">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 mb-4 rounded-full bg-primary text-primary-foreground shadow-md">
            <KeyRound className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-center text-foreground">Reset Your Password</h1>
          <p className="text-muted-foreground text-center mt-2">
            Enter your email and we&apos;ll send you a link to get back into your account.
          </p>
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

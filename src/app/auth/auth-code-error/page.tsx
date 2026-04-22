import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-destructive">
        <CardHeader className="space-y-2 text-center text-destructive">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mb-2">
            <AlertCircle className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Email Link Expired</CardTitle>
          <CardDescription>
            The password reset link is invalid or has already been used.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground pt-4">
          <p className="mb-4">
            For security, password reset links can only be used once and expire after a short period.
          </p>
          <p className="text-sm">
            If you didn't click this link already, your email provider's security scanner might have "pre-clicked" it for you.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 pt-6">
          <Link href="/forgot-password" title="Request new link" className="w-full">
            <Button className="w-full h-11 font-semibold">
                <RefreshCw className="mr-2 h-4 w-4" />
                Request a New Link
            </Button>
          </Link>
          <Link href="/" title="Back to login" className="w-full">
            <Button variant="ghost" className="w-full h-11">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

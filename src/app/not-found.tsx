"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchX, Home, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getCompanyDetails } from "@/services/settings-service";
import type { CompanyDetails } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotFoundPage() {
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBrand = async () => {
        try {
            const details = await getCompanyDetails();
            setCompanyDetails(details);
        } catch (e) {} finally {
            setIsLoading(false);
        }
    };
    fetchBrand();
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
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary relative z-10 bg-card/90">
        <CardHeader className="space-y-2 text-center text-primary">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-2">
            <SearchX className="h-8 w-8" />
          </div>
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-7 w-32" />
            </div>
          ) : (
            <>
                <CardTitle className="text-3xl font-bold tracking-tight">404</CardTitle>
                <CardDescription className="text-lg">
                    Page Not Found
                </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center text-muted-foreground pt-2">
          <p className="mb-4">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 pt-6">
          <Link href="/" title="Back to Home" className="w-full">
            <Button className="w-full h-11 font-semibold">
                <Home className="mr-2 h-4 w-4" />
                Go to Homepage
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

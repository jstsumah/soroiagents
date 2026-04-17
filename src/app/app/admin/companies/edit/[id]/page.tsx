
"use client";

import { getCompany } from "@/services/company-service";
import { notFound, useRouter } from "next/navigation";
import { CompanyForm } from "../../company-form";
import * as React from 'react';
import type { Company } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/app/app/app-provider";
import { Loader2 } from "lucide-react";

export default function EditCompanyPage({ params }: { params: { id: string } }) {
    const { id } = React.use(params);
    const [company, setCompany] = React.useState<Company | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!isAuthLoading && user && user.role === 'Agent') {
          router.replace('/app/agent/dashboard');
          return;
        }

        const fetchCompany = async () => {
            setIsLoading(true);
            const data = await getCompany(id);
            if (!data) {
                notFound();
            }
            setCompany(data);
            setIsLoading(false);
        };
        fetchCompany();
    }, [id, user, isAuthLoading, router]);


    if (isLoading || isAuthLoading) {
        return (
             <div className="space-y-4">
                <div className="flex flex-col gap-2 mb-8">
                    <Skeleton className="h-9 w-64 mb-2" />
                    <Skeleton className="h-5 w-80" />
                </div>
                <Skeleton className="h-[500px] w-full" />
             </div>
        )
    }
    
    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Company</h1>
                <p className="text-muted-foreground">
                Modify the details for &quot;{company!.name}&quot;.
                </p>
            </div>
            <CompanyForm company={company!} />
        </div>
    );
}

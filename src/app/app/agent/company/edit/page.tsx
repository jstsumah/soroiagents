
"use client";

import { notFound, useRouter } from "next/navigation";
import { CompanyForm } from "@/app/app/admin/companies/company-form";
import * as React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import type { Company, User } from "@/lib/types";
import { useAuth } from "@/app/app/app-provider";
import { Loader2 } from "lucide-react";
import { getCompany, addCompany, updateCompany } from "@/services/company-service";
import { updateUser } from "@/services/user-service";
import { useToast } from "@/hooks/use-toast";

const AgentCompanyForm = ({ user, company: initialCompany }: { user: User, company: Company | null }) => {
    const { toast } = useToast();
    const router = useRouter();

    const handleSave = async (companyData: any) => {
        try {
            if (initialCompany) {
                // Editing existing company
                await updateCompany(initialCompany.id, companyData);
                toast({ title: "Company Updated", description: "Your company details have been saved." });
            } else {
                // Creating new company
                const newCompanyId = await addCompany(companyData);
                await updateUser(user.uid, { companyId: newCompanyId, company: companyData.name });
                toast({ title: "Company Created", description: "Your company has been created and linked to your profile." });
            }
            router.push('/app/agent/profile');
            router.refresh();
        } catch (error) {
            console.error("Failed to save company:", error);
            toast({ variant: "destructive", title: "Save Failed", description: "An error occurred while saving company details." });
        }
    };
    
    return <CompanyForm company={initialCompany || undefined} onSubmit={handleSave} />;
};


export default function AgentEditCompanyPage() {
    const [company, setCompany] = React.useState<Company | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!isAuthLoading && !user) {
            router.replace('/app/agent/dashboard');
            return;
        }
        
        if (user) {
            if (user.companyId) {
                const fetchCompany = async () => {
                    setIsLoading(true);
                    const companyData = await getCompany(user.companyId!);
                    if (!companyData) {
                        // This case is unlikely if companyId exists, but handle it.
                        // Agent can create a new company profile.
                        setCompany(null);
                    } else {
                        setCompany(companyData);
                    }
                    setIsLoading(false);
                };
                fetchCompany();
            } else {
                 // User has no company, they will be creating one
                 setIsLoading(false);
            }
        }
    }, [user, isAuthLoading, router]);


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

    if (!user) {
        // This state should be handled by the redirect, but as a fallback.
        return null;
    }
    
    const pageTitle = company ? "Edit Your Company" : "Add Your Company Information";
    const pageDescription = company ? `Modify the details for "${company.name}".` : "Fill out the form below to create a profile for your company.";
    
    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
                <p className="text-muted-foreground">{pageDescription}</p>
            </div>
            <AgentCompanyForm user={user} company={company} />
        </div>
    );
}

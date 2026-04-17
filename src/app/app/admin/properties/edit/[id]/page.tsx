
"use client";

import { getProperty } from "@/services/property-service";
import { notFound, useRouter } from "next/navigation";
import { AddPropertyForm } from "../../add/add-property-form";
import * as React from 'react';
import type { Property } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/app/app/app-provider";
import { Loader2 } from "lucide-react";

export default function EditPropertyPage({ params }: { params: { id: string } }) {
    const { id } = React.use(params);
    const [property, setProperty] = React.useState<Property | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!isAuthLoading && user && !(user.role === 'Admin' || user.role === 'Super Admin')) {
            router.replace('/app/admin/dashboard');
            return;
        }
        
        if (user) {
            const fetchProperty = async () => {
                setIsLoading(true);
                const propData = await getProperty(id);
                if (!propData) {
                    notFound();
                }
                setProperty(propData);
                setIsLoading(false);
            };
            fetchProperty();
        }
    }, [id, user, isAuthLoading, router]);


    if (isLoading || isAuthLoading || !user || !(user.role === 'Admin' || user.role === 'Super Admin')) {
        return (
             <div className="space-y-4">
                <div className="flex flex-col gap-2 mb-8">
                    <Skeleton className="h-9 w-64 mb-2" />
                    <Skeleton className="h-5 w-80" />
                </div>
                <Skeleton className="h-96 w-full" />
             </div>
        )
    }
    
    // The AddPropertyForm now handles both add and edit states.
    // It will render the page title and the form itself.
    return <AddPropertyForm property={property!} />;
}

    
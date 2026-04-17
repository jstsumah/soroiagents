
"use client";

import { getResource } from "@/services/resource-service";
import { notFound, useRouter } from "next/navigation";
import { EditResourceForm } from "./edit-resource-form";
import * as React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import type { Resource } from "@/lib/types";
import { useAuth } from "../../../../app-provider";
import { Loader2 } from "lucide-react";

export default function EditResourcePage({ params }: { params: { id: string } }) {
    const { id } = React.use(params);
    const [resource, setResource] = React.useState<Resource | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();


    React.useEffect(() => {
        if (!isAuthLoading && user && !(user.role === 'Admin' || user.role === 'Super Admin')) {
            router.replace('/app/admin/dashboard');
            return;
        }
        
        if(user) {
            const fetchResource = async () => {
                setIsLoading(true);
                const data = await getResource(id);
                if (!data) {
                    notFound();
                }
                setResource(data);
                setIsLoading(false);
            };
            fetchResource();
        }
    }, [id, user, isAuthLoading, router]);


    if (isLoading || isAuthLoading || !user || !(user.role === 'Admin' || user.role === 'Super Admin')) {
        return (
             <div className="flex flex-col gap-8">
                <div>
                    <Skeleton className="h-9 w-1/2 mb-2" />
                    <Skeleton className="h-5 w-1/3" />
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    if (!resource) {
        notFound();
    }


    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Resource</h1>
                <p className="text-muted-foreground">
                Modify the details for &quot;{resource.title}&quot;.
                </p>
            </div>
            <EditResourceForm resource={resource} />
        </div>
    );
}

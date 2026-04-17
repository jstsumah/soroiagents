
"use client";

import { notFound, useRouter } from "next/navigation";
import { AddTrainingForm } from "../../add/add-training-form";
import type { TrainingResource } from "@/lib/types";
import { getTrainingResource } from "@/services/training-resource-service";
import * as React from "react";
import { useAuth } from "@/app/app/app-provider";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditTrainingResourcePage({ params }: { params: { id: string } }) {
    const { id } = React.use(params);
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const [resource, setResource] = React.useState<TrainingResource | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    
    React.useEffect(() => {
        if (!isAuthLoading && user && user.role === 'Agent') {
          router.replace('/app/agent/dashboard');
          return;
        }

        const fetchResource = async () => {
            setIsLoading(true);
            const resourceData = await getTrainingResource(id);
            if (!resourceData) {
                notFound();
            }
            setResource(resourceData);
            setIsLoading(false);
        };

        if (user) {
            fetchResource();
        }
    }, [id, user, isAuthLoading, router]);

    if (isLoading || isAuthLoading) {
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
                <h1 className="text-3xl font-bold tracking-tight">Edit Training Material</h1>
                <p className="text-muted-foreground">
                Modify the details for &quot;{resource.title}&quot;.
                </p>
            </div>
            <AddTrainingForm trainingResource={resource} />
        </div>
    );
}

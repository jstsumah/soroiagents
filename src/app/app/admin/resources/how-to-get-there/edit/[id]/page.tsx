
"use client";

import { notFound, useRouter } from "next/navigation";
import { HowToGetThereForm } from "../../add/how-to-get-there-form";
import { getLocation } from "@/services/how-to-get-there-service";
import * as React from 'react';
import type { HowToGetThereLocation } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/app/app/app-provider";
import { Loader2 } from "lucide-react";

export default function EditHowToGetTherePage({ params }: { params: { id: string } }) {
    const { id } = React.use(params);
    const [location, setLocation] = React.useState<HowToGetThereLocation | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!isAuthLoading && user && user.role === 'Agent') {
          router.replace('/app/agent/dashboard');
          return;
        }

        if(user) {
            const fetchLocation = async () => {
                setIsLoading(true);
                const data = await getLocation(id);
                setLocation(data);
                setIsLoading(false);
            };
            fetchLocation();
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

    if (!location) {
        notFound();
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Location</h1>
                <p className="text-muted-foreground">
                Modify the details for &quot;{location.name}&quot;.
                </p>
            </div>
            <HowToGetThereForm locationData={location} />
        </div>
    );
}

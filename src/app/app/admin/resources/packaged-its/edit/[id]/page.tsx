
"use client";

import { getItinerary } from "@/services/itinerary-service";
import { notFound, useRouter } from "next/navigation";
import { ItineraryForm } from "../../add/add-itinerary-form";
import * as React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import type { PackagedItinerary } from "@/lib/types";
import { useAuth } from "@/app/app/app-provider";
import { Loader2 } from "lucide-react";

export default function EditPackagedItineraryPage({ params }: { params: { id: string } }) {
    const { id } = React.use(params);
    const [itinerary, setItinerary] = React.useState<PackagedItinerary | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    
    React.useEffect(() => {
        if (!isAuthLoading && user && !(user.role === 'Admin' || user.role === 'Super Admin')) {
            router.replace('/app/admin/dashboard');
            return;
        }

        if (user) {
            const fetchItinerary = async () => {
                setIsLoading(true);
                const data = await getItinerary(id);
                if (!data) {
                    notFound();
                }
                setItinerary(data);
                setIsLoading(false);
            };
            fetchItinerary();
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

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Packaged Itinerary</h1>
                <p className="text-muted-foreground">
                Modify the details for &quot;{itinerary!.title}&quot;.
                </p>
            </div>
            <ItineraryForm itinerary={itinerary!} />
        </div>
    );
}

    
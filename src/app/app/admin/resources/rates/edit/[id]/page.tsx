
"use client";

import { getRate } from "@/services/rate-service";
import { notFound, useRouter } from "next/navigation";
import { EditRateForm } from "./edit-rate-form";
import * as React from 'react';
import type { Rate } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/app/app/app-provider";
import { Loader2 } from "lucide-react";

export default function EditRatePage({ params }: { params: { id: string } }) {
    const { id } = React.use(params);
    const [rate, setRate] = React.useState<Rate | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!isAuthLoading && user && user.role === 'Agent') {
          router.replace('/app/agent/dashboard');
          return;
        }

        const fetchRate = async () => {
            setIsLoading(true);
            const rateData = await getRate(id);
            if (!rateData) {
                notFound();
            }
            setRate(rateData);
            setIsLoading(false);
        };

        if (user) {
            fetchRate();
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

    if (!rate) {
        return notFound();
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Rate Card</h1>
                <p className="text-muted-foreground">
                Modify the details for &quot;{rate.title}&quot;.
                </p>
            </div>
            <EditRateForm rate={rate} />
        </div>
    );
}

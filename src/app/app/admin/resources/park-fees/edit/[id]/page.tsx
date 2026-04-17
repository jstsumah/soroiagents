
"use client";

import { notFound, useRouter } from "next/navigation";
import { ParkFeeForm } from "../../add/park-fee-form";
import { getParkFee } from "@/services/park-fee-service";
import * as React from 'react';
import type { ParkFee } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/app/app/app-provider";
import { Loader2 } from "lucide-react";

export default function EditParkFeePage({ params }: { params: { id: string } }) {
    const { id: feeId } = React.use(params);
    const [fee, setFee] = React.useState<ParkFee | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!isAuthLoading && user && user.role === 'Agent') {
          router.replace('/app/agent/dashboard');
          return;
        }
        
        if (user) {
             const fetchFee = async () => {
                setIsLoading(true);
                const feeData = await getParkFee(feeId);
                if (!feeData) {
                    notFound();
                }
                setFee(feeData);
                setIsLoading(false);
            };
            fetchFee();
        }
    }, [feeId, user, isAuthLoading, router]);

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

    if (!fee) {
        notFound();
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Park Fee</h1>
                <p className="text-muted-foreground">
                Modify the fee details for &quot;{fee.location}&quot;.
                </p>
            </div>
            <ParkFeeForm parkFee={fee} />
        </div>
    );
}


"use client";

import { getDeal } from "@/services/deal-service";
import { notFound, useRouter } from "next/navigation";
import { EditDealForm } from "./edit-deal-form";
import * as React from 'react';
import type { ExclusiveDeal } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/app/app/app-provider";
import { Loader2 } from "lucide-react";

export default function EditDealPage({ params }: { params: { id: string } }) {
    const { id } = React.use(params);
    const [deal, setDeal] = React.useState<ExclusiveDeal | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!isAuthLoading && user && user.role === 'Agent') {
          router.replace('/app/agent/dashboard');
          return;
        }

        if (user) {
             const fetchDeal = async () => {
                setIsLoading(true);
                const dealData = await getDeal(id);
                if (!dealData) {
                    notFound();
                }
                setDeal(dealData);
                setIsLoading(false);
            }
            fetchDeal();
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


    if (!deal) {
        notFound();
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Exclusive Deal</h1>
                <p className="text-muted-foreground">
                Modify the details for &quot;{deal.title}&quot;.
                </p>
            </div>
            <EditDealForm deal={deal} />
        </div>
    );
}

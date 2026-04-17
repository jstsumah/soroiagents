

"use client";

import * as React from 'react';
import { ParkFeeCard } from "./park-fee-card";
import { Button } from "@/components/ui/button";
import { Info, Mail, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/app/app/app-provider";
import type { User, ParkFee } from "@/lib/types";
import { getUser } from '@/services/user-service';
import { getParkFees } from '@/services/park-fee-service';


export default function ParkFeesPage() {
  const { user: currentAgent, isLoading: authLoading } = useAuth();
  const [parkFees, setParkFees] = React.useState<ParkFee[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      if (currentAgent) {
        try {
          const fees = await getParkFees();
          setParkFees(fees);
        } catch (error) {
          console.error("Failed to fetch park fees page data:", error);
        } finally {
          setIsLoading(false);
        }
      } else if (!authLoading) {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentAgent, authLoading]);
  
  if (isLoading || authLoading) {
    return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    )
  }
  
  if (!currentAgent) {
     return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center h-96">
            <h3 className="text-xl font-semibold tracking-tight">Agent Not Found</h3>
            <p className="text-muted-foreground mt-2">
                Could not load agent data. Please sign in again.
            </p>
        </div>
    )
  }
  
  const feesForUserType = currentAgent.hasAllTierAccess
    ? parkFees
    : parkFees.filter(fee => fee.user_type === currentAgent?.type);


  const residentFees = feesForUserType.filter(fee => fee.user_type === 'local');
  const nonResidentFees = feesForUserType.filter(fee => fee.user_type === 'international');

  const FeeSection = ({ title, fees, currency }: { title: string, fees: ParkFee[], currency: 'KES' | 'USD' }) => (
     <div className="flex flex-col gap-8">
        <h2 className="text-2xl font-bold tracking-tight text-center">{title}</h2>
        {fees.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-3 items-start">
            {fees.map((feeInfo) => (
              <ParkFeeCard key={feeInfo.id} feeInfo={feeInfo} currency={currency} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center h-64">
              <h3 className="text-xl font-semibold tracking-tight">No Fees Found</h3>
               <p className="text-muted-foreground mt-2">
                There are currently no {title.toLowerCase()} available.
            </p>
          </div>
        )}
      </div>
  );

  return (
    <div className="flex flex-col gap-12">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight uppercase text-primary">Conservation & Park Fees</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Applicable To All Bookings
        </p>
         <div className="mt-4 p-3 bg-muted/50 rounded-lg text-base text-muted-foreground inline-flex items-center gap-2">
            <Info className="h-[18px] w-[18px] shrink-0" />
            <div>
              <p>Want these in your branding? Easy, let us know on <a href="mailto:sales@soroi.com" className="font-semibold text-primary hover:underline">sales@soroi.com</a></p>
            </div>
          </div>
      </div>
      
       {currentAgent.type === 'local' || currentAgent.hasAllTierAccess ? (
        <>
            <FeeSection title="Resident Fees (KES)" fees={residentFees} currency="KES" />
            <Separator />
            <FeeSection title="Non-Resident Fees (USD)" fees={nonResidentFees} currency="USD" />
        </>
       ) : (
            <FeeSection title="Non-Resident Fees (USD)" fees={nonResidentFees} currency="USD" />
       )}

    </div>
  );
}

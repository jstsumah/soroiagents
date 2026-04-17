

"use client";

import * as React from "react";
import Image from "next/image";
import { HowToGetThereClient } from "@/app/app/admin/resources/how-to-get-there/how-to-get-there-client";
import { Info, Loader2 } from "lucide-react";
import { useAuth } from "@/app/app/app-provider";
import type { Tier, User, HowToGetThereLocation } from "@/lib/types";
import { getUser } from "@/services/user-service";
import { getLocations } from "@/services/how-to-get-there-service";
import { getCompanyDetails } from "@/services/settings-service";

export default function HowToGetTherePage() {
  const { user: currentAgent, isLoading: authLoading } = useAuth();
  const [allLocations, setAllLocations] = React.useState<HowToGetThereLocation[]>([]);
  const [flightRoutesImageUrl, setFlightRoutesImageUrl] = React.useState<string | undefined>('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
        if (currentAgent) {
            try {
                const [locations, companyDetails] = await Promise.all([
                    getLocations(),
                    getCompanyDetails()
                ]);
                setAllLocations(locations);
                setFlightRoutesImageUrl(companyDetails.flightRoutesImageUrl);
            } catch (error) {
                console.error("Failed to fetch data:", error);
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

  const agentTier = currentAgent.tier;

  const availableData = allLocations.filter(location => 
    currentAgent.hasAllTierAccess || location.tier_access.includes(agentTier)
  );

  return (
    <div className="flex flex-col gap-8">
       <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight uppercase text-primary">Property Location</h1>
         <div className="mt-4 p-3 bg-muted/50 rounded-lg text-base text-muted-foreground inline-flex items-center gap-2">
            <Info className="h-[18px] w-[18px] shrink-0" />
            <div>
              <p>For departure and arrival times please check directly with the airline or call our reservation office</p>
            </div>
          </div>
      </div>
      
      {availableData.length > 0 ? (
        <HowToGetThereClient data={availableData} flightRoutesImageUrl={flightRoutesImageUrl} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center h-96">
            <h3 className="text-xl font-semibold tracking-tight">No Information Available</h3>
            <p className="text-muted-foreground mt-2">
                There is currently no &quot;How To Get There&quot; information available for your access tier.
            </p>
        </div>
      )}
    </div>
  );
}

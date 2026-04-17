
"use client";

import { ResourceCard } from "../resource-card";
import type { User, Resource } from "@/lib/types";
import { useEffect, useState, useMemo } from "react";
import { getUser } from "@/services/user-service";
import { getResources } from "@/services/resource-service";
import { Loader2, Search } from "lucide-react";
import { useAuth } from "@/app/app/app-provider";
import { Input } from "@/components/ui/input";

export default function AgentSingleItinerariesPage() {
  const { user: currentAgent, isLoading: authLoading } = useAuth();
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (currentAgent) {
        try {
          const resources = await getResources();
          setAllResources(resources.filter(r => r.category === 'single-itineraries'));
        } catch (error) {
          console.error("Failed to fetch data:", error);
        } finally {
          setIsLoading(false);
        }
      } else if (!authLoading) {
        setAllResources([]);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentAgent, authLoading]);

  const availableResources = useMemo(() => {
    if (!currentAgent) {
      return [];
    }
    
    const tierFiltered = allResources.filter(resource => 
      resource.tier_access.includes(currentAgent.tier)
    );

    if (!searchTerm) {
        return tierFiltered;
    }

    const lowercasedFilter = searchTerm.toLowerCase();
    return tierFiltered.filter(resource =>
      resource.title.toLowerCase().includes(lowercasedFilter) ||
      resource.description.toLowerCase().includes(lowercasedFilter)
    );

  }, [currentAgent, allResources, searchTerm]);
  

  if (isLoading || authLoading) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <h3 className="text-xl font-semibold tracking-tight mt-4">Loading Itineraries...</h3>
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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Single Itineraries</h1>
        <p className="text-muted-foreground">
          Browse individual itinerary documents available for your tier: <span className="font-semibold text-primary">{currentAgent.tier}</span>.
        </p>
      </div>
       <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Search by title or description..." 
          className="pl-10" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
       {availableResources.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {availableResources.map(resource => (
            <ResourceCard key={resource.id} resource={resource} />
            ))}
        </div>
        ) : (
            <div className="text-center text-muted-foreground col-span-full py-12">
            {searchTerm 
                ? `No itineraries matched your search for "${searchTerm}".` 
                : "No single itineraries found for your tier."
            }
        </div>
        )}
    </div>
  );
}



"use client";

import * as React from 'react';
import type { User, PackagedItinerary, Resource } from "@/lib/types";
import { ItineraryCard } from "./itinerary-card";
import { getUser } from "@/services/user-service";
import { getItineraries } from "@/services/itinerary-service";
import { getResources } from "@/services/resource-service";
import { Loader2, ArrowDown, ArrowUp, Search } from "lucide-react";
import { useAuth } from '@/app/app/app-provider';
import { ResourceCard } from '@/components/ui/resource-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type UnifiedItinerary = (PackagedItinerary & { type: 'packaged' }) | (Resource & { type: 'single' });
type SortKey = 'title' | 'uploaded_at';
type SortDirection = 'asc' | 'desc';

export default function AgentItinerariesPage() {
  const { user: currentAgent, isLoading: authLoading } = useAuth();
  const [allItineraries, setAllItineraries] = React.useState<UnifiedItinerary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortKey, setSortKey] = React.useState<SortKey>('uploaded_at');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');

  React.useEffect(() => {
    const fetchData = async () => {
        if (currentAgent) {
            try {
                const [packagedIts, allResources] = await Promise.all([
                    getItineraries(),
                    getResources()
                ]);

                const singleIts = allResources.filter(r => r.category === 'itineraries');

                const combined: UnifiedItinerary[] = [
                    ...packagedIts.map(it => ({ ...it, type: 'packaged' as const })),
                    ...singleIts.map(it => ({ ...it, type: 'single' as const }))
                ];

                setAllItineraries(combined);

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

  const availableItineraries = React.useMemo(() => {
    if (!currentAgent) return [];

    let filtered = allItineraries.filter(itinerary => {
        if (currentAgent.status === 'pending' && itinerary.type === 'packaged' && itinerary.isNetPackage) {
            return false;
        }
        
        if (currentAgent.hasAllTierAccess) return true;
        
        if (itinerary.type === 'packaged') {
             const hasTierAccess = itinerary.tier_access.includes(currentAgent.tier);
             const hasUserTypeAccess = itinerary.user_type_access.includes(currentAgent.type);
             return hasTierAccess && hasUserTypeAccess;
        } else { // single
            return itinerary.tier_access.includes(currentAgent.tier);
        }
    });
    
    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        filtered = filtered.filter(it =>
            it.title.toLowerCase().includes(lowercasedFilter)
        );
    }
    
    filtered.sort((a, b) => {
        if (sortKey === 'title') {
            const comparison = a.title.localeCompare(b.title);
            return sortDirection === 'asc' ? comparison : -comparison;
        }
        const dateA = new Date(a.uploaded_at).getTime();
        const dateB = new Date(b.uploaded_at).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });

    filtered.sort((a, b) => {
        const aIsFeatured = a.type === 'packaged' && a.featured;
        const bIsFeatured = b.type === 'packaged' && b.featured;
        if (aIsFeatured && !bIsFeatured) return -1;
        if (!aIsFeatured && bIsFeatured) return 1;
        return 0;
    });

    return filtered;

  }, [currentAgent, allItineraries, searchTerm, sortKey, sortDirection]);


  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!currentAgent) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center h-96">
            <h3 className="text-xl font-semibold tracking-tight">Agent Not Found</h3>
            <p className="text-muted-foreground mt-2">
                Could not load agent data. Please try again later.
            </p>
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Itineraries</h1>
        <p className="text-muted-foreground">
          Browse itineraries available for your tier: <span className="font-semibold text-primary">{currentAgent.tier}</span>.
        </p>
      </div>
      
       <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
            placeholder="Search by title..." 
            className="pl-10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="flex items-center gap-2">
            <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="uploaded_at">Date</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}>
                {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </Button>
        </div>
      </div>

       {availableItineraries.length > 0 ? (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {availableItineraries.map((itinerary) => (
             itinerary.type === 'packaged' 
                ? <ItineraryCard key={itinerary.id} itinerary={itinerary} />
                : <ResourceCard key={itinerary.id} resource={itinerary} />
          ))}
        </div>
      ) : (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center h-96">
            <h3 className="text-xl font-semibold tracking-tight">No Itineraries Available</h3>
            <p className="text-muted-foreground mt-2">
                There are currently no itineraries available for your access profile.
            </p>
        </div>
      )}
    </div>
  );
}

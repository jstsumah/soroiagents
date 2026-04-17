

"use client";

import * as React from 'react';
import type { Tier, User, Rate } from "@/lib/types";
import { AgentRateCard } from "./rate-card";
import { getUser } from "@/services/user-service";
import { getRates } from "@/services/rate-service";
import { Loader2, Search, ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from '@/app/app/app-provider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type SortKey = 'title' | 'uploaded_at';
type SortDirection = 'asc' | 'desc';

export default function AgentRatesPage() {
  const { user: currentAgent, isLoading: authLoading } = useAuth();
  const [allRates, setAllRates] = React.useState<Rate[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortKey, setSortKey] = React.useState<SortKey>('uploaded_at');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');

  React.useEffect(() => {
    const fetchData = async () => {
        if (currentAgent) {
            try {
                const rates = await getRates();
                setAllRates(rates);
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
  
  const availableRates = React.useMemo(() => {
    if (!currentAgent) return [];

    let filtered = allRates.filter(rate => {
        if (currentAgent.hasAllTierAccess) return true;

        const hasTierAccess = rate.tier_access.includes(currentAgent.tier);
        const hasUserTypeAccess = rate.user_type_access.includes(currentAgent.type);
        const isRackRate = rate.title.toLowerCase().includes('rack');

        if (currentAgent.status === 'pending' || currentAgent.tier === 'Rack Rates') {
            return isRackRate && hasTierAccess && hasUserTypeAccess;
        }

        return hasTierAccess && hasUserTypeAccess;
    });

    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        filtered = filtered.filter(rate =>
            rate.title.toLowerCase().includes(lowercasedFilter) ||
            rate.description.toLowerCase().includes(lowercasedFilter)
        );
    }
    
    filtered.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        
        let comparison = 0;
        if (valA > valB) {
            comparison = 1;
        } else if (valA < valB) {
            comparison = -1;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;

  }, [currentAgent, allRates, searchTerm, sortKey, sortDirection]);

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
        <h1 className="text-3xl font-bold tracking-tight">Rates</h1>
        <p className="text-muted-foreground">
          Download the latest contracted rates available for your tier: <span className="font-semibold text-primary">{currentAgent.tier}</span> and type: <span className="font-semibold text-primary capitalize">{currentAgent.type}</span>.
        </p>
      </div>

       <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
            placeholder="Search by title or description..." 
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

       {availableRates.length > 0 ? (
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {availableRates.map((rate) => (
            <AgentRateCard key={rate.id} rate={rate} />
          ))}
        </div>
      ) : (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center h-96">
            <h3 className="text-xl font-semibold tracking-tight">No Rate Cards Available</h3>
            <p className="text-muted-foreground mt-2">
                There are currently no rate cards available for your access profile.
            </p>
        </div>
      )}
    </div>
  );
}



"use client";

import * as React from 'react';
import type { Tier, User, ExclusiveDeal } from "@/lib/types";
import { AgentDealCard } from "./deal-card";
import { getUser } from "@/services/user-service";
import { getDeals } from "@/services/deal-service";
import { Loader2, ArrowDown, ArrowUp, Search } from "lucide-react";
import { useAuth } from '@/app/app/app-provider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type SortKey = 'title' | 'valid_until';
type SortDirection = 'asc' | 'desc';

export default function AgentExclusiveDealsPage() {
  const { user: currentAgent, isLoading: authLoading } = useAuth();
  const [allDeals, setAllDeals] = React.useState<ExclusiveDeal[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortKey, setSortKey] = React.useState<SortKey>('valid_until');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');

  React.useEffect(() => {
    const fetchData = async () => {
        if (currentAgent) {
            try {
                const deals = await getDeals();
                setAllDeals(deals);
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
  
  const availableDeals = React.useMemo(() => {
    if (!currentAgent) return [];

    let filtered = allDeals.filter(deal => {
        if (currentAgent.hasAllTierAccess) return true;
        const hasTierAccess = deal.tier_access.includes(currentAgent.tier);
        const hasUserTypeAccess = deal.user_type_access.includes(currentAgent.type);
        return hasTierAccess && hasUserTypeAccess;
    });

    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        filtered = filtered.filter(deal =>
            deal.title.toLowerCase().includes(lowercasedFilter) ||
            deal.description.toLowerCase().includes(lowercasedFilter)
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

  }, [currentAgent, allDeals, searchTerm, sortKey, sortDirection]);

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
        <h1 className="text-3xl font-bold tracking-tight">Exclusive Deals</h1>
        <p className="text-muted-foreground">
          Special offers available for your tier: <span className="font-semibold text-primary">{currentAgent.tier}</span> and type: <span className="font-semibold text-primary capitalize">{currentAgent.type}</span>.
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
                    <SelectItem value="valid_until">Expiry Date</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}>
                {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </Button>
        </div>
      </div>

       {availableDeals.length > 0 ? (
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {availableDeals.map((deal) => (
            <AgentDealCard key={deal.id} deal={deal} />
          ))}
        </div>
      ) : (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center h-96">
            <h3 className="text-xl font-semibold tracking-tight">No Exclusive Deals Available</h3>
            <p className="text-muted-foreground mt-2">
                There are currently no deals available for your access profile.
            </p>
        </div>
      )}
    </div>
  );
}

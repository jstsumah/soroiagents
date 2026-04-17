

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceCard } from "./resource-card";
import type { User, Resource, Category } from "@/lib/types";
import { useEffect, useState, useMemo } from "react";
import { getUser } from "@/services/user-service";
import { getResources } from "@/services/resource-service";
import { Loader2, Search, ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from "@/app/app/app-provider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const DOWNLOAD_CATEGORIES: Category[] = ['brochures', 'factsheet', 'activity-sheets', 'spa-menu', 'images', 'videos'];

type SortKey = 'title' | 'uploaded_at' | 'category';
type SortDirection = 'asc' | 'desc';

export default function AgentDownloadsPage() {
  const { user: currentAgent, isLoading: authLoading } = useAuth();
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sortKey, setSortKey] = useState<SortKey>('uploaded_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    const fetchData = async () => {
      if (currentAgent) {
        try {
          const resources = await getResources();
          setAllResources(resources.filter(r => DOWNLOAD_CATEGORIES.includes(r.category)));
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
    
    let filtered = allResources.filter(resource => 
      currentAgent.hasAllTierAccess || resource.tier_access.includes(currentAgent.tier)
    );

    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        filtered = filtered.filter(resource =>
        resource.title.toLowerCase().includes(lowercasedFilter) ||
        resource.description.toLowerCase().includes(lowercasedFilter)
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

  }, [currentAgent, allResources, searchTerm, sortKey, sortDirection]);
  

  if (isLoading || authLoading) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <h3 className="text-xl font-semibold tracking-tight mt-4">Loading Downloads...</h3>
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
        <h1 className="text-3xl font-bold tracking-tight">Downloads</h1>
        <p className="text-muted-foreground">
          Access marketing materials, rates, and itineraries for your tier: <span className="font-semibold text-primary">{currentAgent.tier}</span>.
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
                    <SelectItem value="category">Category</SelectItem>
                </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}>
                {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </Button>
        </div>
      </div>
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-7">
           <TabsTrigger value="all">All</TabsTrigger>
          {DOWNLOAD_CATEGORIES.map(category => (
            <TabsTrigger key={category} value={category} className="capitalize">
                {category === 'activity-sheets' ? 'Activities' : category.replace('-', ' ')}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-6">
           {availableResources.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {availableResources.map(resource => (
                <ResourceCard key={resource.id} resource={resource} />
                ))}
            </div>
            ) : (
             <div className="text-center text-muted-foreground col-span-full py-12">
                {searchTerm 
                    ? `No downloads matched your search for "${searchTerm}".` 
                    : "No downloads found for your tier."
                }
            </div>
           )}
        </TabsContent>

        {DOWNLOAD_CATEGORIES.map(category => (
          <TabsContent key={category} value={category} className="mt-6">
             {availableResources.filter(r => r.category === category).length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {availableResources
                    .filter(r => r.category === category)
                    .map(resource => (
                    <ResourceCard key={resource.id} resource={resource} />
                ))}
                </div>
             ) : (
                <div className="text-center text-muted-foreground col-span-full py-12">
                  {searchTerm 
                    ? `No downloads matched your search for "${searchTerm}" in this category.` 
                    : "No downloads found in this category for your tier."
                  }
                </div>
              )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

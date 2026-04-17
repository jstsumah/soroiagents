
"use client";

import * as React from 'react';
import { ResourceTable } from "../resource-table";
import { getResources } from "@/services/resource-service";
import type { Resource } from '@/lib/types';
import { Loader2, PlusCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

export default function AdminSingleItinerariesPage() {
  const [resources, setResources] = React.useState<Resource[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

  const fetchResources = React.useCallback(async () => {
    setIsLoading(true);
    const res = await getResources();
    setResources((res || []).filter(r => r.category === 'single-itineraries'));
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const filteredResources = React.useMemo(() => {
    if (!searchTerm) {
        return resources;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return resources.filter(resource =>
      resource.title.toLowerCase().includes(lowercasedFilter) ||
      resource.description.toLowerCase().includes(lowercasedFilter)
    );
  }, [searchTerm, resources]);


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Single Itineraries</h1>
            <p className="text-muted-foreground">
              Upload and manage single, downloadable itinerary files.
            </p>
        </div>
        <Link href="/app/admin/resources/single-itineraries/add">
            <Button>
                <PlusCircle className="mr-2 h-[18px] w-[18px]" />
                Add New Itinerary
            </Button>
        </Link>
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
      
        {isLoading ? (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
            <ResourceTable resources={filteredResources} />
        )}
    </div>
  );
}


"use client";

import * as React from 'react';
import { getProperties } from "@/services/property-service";
import { PropertyCard } from "./property-card";
import { Input } from "@/components/ui/input";
import { Search, Loader2, ArrowDown, ArrowUp } from "lucide-react";
import type { Property } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type SortKey = 'name' | 'location';
type SortDirection = 'asc' | 'desc';


export default function AgentPropertiesPage() {
  const [allProperties, setAllProperties] = React.useState<Property[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortKey, setSortKey] = React.useState<SortKey>('name');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');

  React.useEffect(() => {
    const fetchProperties = async () => {
      setIsLoading(true);
      try {
        const props = await getProperties();
        setAllProperties(props);
      } catch (error) {
        console.error("Failed to fetch properties:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const sortedAndFilteredProperties = React.useMemo(() => {
    if (isLoading) {
        return [];
    }
    let filtered = [...allProperties];
    
    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        filtered = filtered.filter(property =>
            property.name.toLowerCase().includes(lowercasedFilter) ||
            property.location.toLowerCase().includes(lowercasedFilter)
        );
    }
    
    filtered.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        
        let comparison = valA.localeCompare(valB, undefined, { numeric: true });

        return sortDirection === 'asc' ? comparison : -comparison;
    });


    return filtered;
  }, [searchTerm, allProperties, isLoading, sortKey, sortDirection]);


  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
        <p className="text-muted-foreground">
          Browse our portfolio of curated hotels, lodges, and camps.
        </p>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
            placeholder="Search by name or location..." 
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
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}>
                {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : sortedAndFilteredProperties.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedAndFilteredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center">
            <h3 className="text-xl font-semibold tracking-tight">No Properties Found</h3>
            <p className="text-muted-foreground mt-2 mb-4">
                {searchTerm 
                    ? `Your search for "${searchTerm}" did not match any properties.`
                    : "There are currently no properties available."
                }
            </p>
        </div>
      )}
    </div>
  );
}

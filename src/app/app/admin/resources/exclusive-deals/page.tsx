
"use client";

import * as React from 'react';
import { getDeals, importDeals } from "@/services/deal-service";
import { AdminDealCard } from "./deal-card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, ArrowDown, ArrowUp, Search } from "lucide-react";
import Link from "next/link";
import type { ExclusiveDeal } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/app/app/app-provider';
import { useRouter } from 'next/navigation';
import { DataMigrationButtons } from "@/components/admin/data-migration-buttons";

type SortKey = 'title' | 'valid_until';
type SortDirection = 'asc' | 'desc';

export default function AdminExclusiveDealsPage() {
  const [deals, setDeals] = React.useState<ExclusiveDeal[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortKey, setSortKey] = React.useState<SortKey>('valid_until');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isAuthLoading && user && user.role === 'Agent') {
      router.replace('/app/agent/dashboard');
      return;
    }
  }, [user, isAuthLoading, router]);

  const fetchDeals = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedDeals = await getDeals();
      setDeals(fetchedDeals);
    } catch (error) {
      console.error("Failed to fetch deals:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleDeleteDeal = (id: string) => {
    setDeals(prevDeals => prevDeals.filter(deal => deal.id !== id));
  };
  
  const sortedAndFilteredDeals = React.useMemo(() => {
    let filtered = [...deals];
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
  }, [deals, searchTerm, sortKey, sortDirection]);

  if (isAuthLoading || !user) {
    return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Exclusive Deals</h1>
          <p className="text-muted-foreground">
            Add, edit, and manage special offers for your agents.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DataMigrationButtons 
            data={deals} 
            onImport={async (importedData) => {
              const result = await importDeals(importedData);
              fetchDeals();
              return result;
            }} 
            entityName="Deals" 
          />
          <Link href="/app/admin/resources/exclusive-deals/add">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Deal
            </Button>
          </Link>
        </div>
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

       {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
       ) : sortedAndFilteredDeals.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedAndFilteredDeals.map((deal) => (
            <AdminDealCard key={deal.id} deal={deal} onDelete={handleDeleteDeal} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center">
            <h3 className="text-xl font-semibold tracking-tight">No Deals Found</h3>
            <p className="text-muted-foreground mt-2 mb-4">
                Get started by adding your first exclusive deal.
            </p>
             <Link href="/app/admin/resources/exclusive-deals/add">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Exclusive Deal
                </Button>
            </Link>
        </div>
      )}
    </div>
  );
}

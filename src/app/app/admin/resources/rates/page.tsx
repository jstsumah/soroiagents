
"use client";

import * as React from 'react';
import { getRates } from "@/services/rate-service";
import { AdminRateCard } from "./rate-card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Search, ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import type { Rate } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/app/app/app-provider';
import { useRouter } from 'next/navigation';

type SortKey = 'title' | 'uploaded_at';
type SortDirection = 'asc' | 'desc';

export default function AdminRatesPage() {
  const [rates, setRates] = React.useState<Rate[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortKey, setSortKey] = React.useState<SortKey>('uploaded_at');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    // Permission check
    if (!isAuthLoading && user && user.role === 'Agent') {
      router.replace('/app/agent/dashboard');
    }
  }, [user?.role, isAuthLoading, router]);

  React.useEffect(() => {
    if (user) {
        // Only show loading spinner if we don't have rates yet
        if (rates.length === 0) {
            setIsLoading(true);
        }
        const fetchData = async () => {
            try {
                const fetchedRates = await getRates();
                setRates(fetchedRates);
            } catch (error) {
                console.error("Failed to fetch rates:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }
  }, [user?.uid]);

  const handleDeleteRate = (id: string) => {
    setRates(prevRates => prevRates.filter(rate => rate.id !== id));
  };
  
  const sortedAndFilteredRates = React.useMemo(() => {
    let filtered = [...rates];
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
  }, [rates, searchTerm, sortKey, sortDirection]);

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
          <h1 className="text-3xl font-bold tracking-tight">Manage Rates</h1>
          <p className="text-muted-foreground">
            Add, edit, and manage rate cards for your agents.
          </p>
        </div>
        <Link href="/app/admin/resources/rates/add">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Rate
          </Button>
        </Link>
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

       {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
       ) : sortedAndFilteredRates.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedAndFilteredRates.map((rate) => (
            <AdminRateCard key={rate.id} rate={rate} onDelete={handleDeleteRate} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center">
            <h3 className="text-xl font-semibold tracking-tight">No Rate Cards Found</h3>
            <p className="text-muted-foreground mt-2 mb-4">
                Get started by adding your first rate card.
            </p>
             <Link href="/app/admin/resources/rates/add">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Rate Card
                </Button>
            </Link>
        </div>
      )}
    </div>
  );
}

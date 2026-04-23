
"use client";

import * as React from 'react';
import { getItineraries, deleteItinerary } from "@/services/itinerary-service";
import { ItineraryCard } from "./itinerary-card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Search, ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import type { PackagedItinerary, Resource } from '@/lib/types';
import { getResources, deleteResource } from '@/services/resource-service';
import { ResourceCard } from '@/components/ui/resource-card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/app/app-provider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type UnifiedItinerary = (PackagedItinerary & { type: 'packaged' }) | (Resource & { type: 'single' });
type SortKey = 'title' | 'uploaded_at';
type SortDirection = 'asc' | 'desc';

export default function AdminItinerariesPage() {
  const [itineraries, setItineraries] = React.useState<UnifiedItinerary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const { user: viewingUser, isLoading: isAuthLoading } = useAuth();
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortKey, setSortKey] = React.useState<SortKey>('uploaded_at');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');

  React.useEffect(() => {
    // Permission check
    if (!isAuthLoading && viewingUser && viewingUser.role === 'Agent') {
      router.replace('/app/agent/dashboard');
    }
  }, [viewingUser?.role, isAuthLoading, router]);

  const canEdit = viewingUser?.role === 'Admin' || viewingUser?.role === 'Super Admin';

  React.useEffect(() => {
    if (viewingUser) {
        // Only show loading spinner if we don't have itineraries yet
        if (itineraries.length === 0) {
            setIsLoading(true);
        }
        const fetchData = async () => {
            try {
                const [packagedIts, resourceIts] = await Promise.all([
                    getItineraries(),
                    getResources(),
                ]);

                const singleIts = resourceIts.filter(r => r.category === 'itineraries');

                const allIts: UnifiedItinerary[] = [
                    ...packagedIts.map(it => ({ ...it, type: 'packaged' as const })),
                    ...singleIts.map(it => ({ ...it, type: 'single' as const }))
                ];

                setItineraries(allIts);
            } catch (e) {
                console.error("Failed to fetch itineraries", e);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Could not load itineraries.",
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }
  }, [viewingUser?.uid, toast]); // Using viewingUser?.uid instead of full object and fetchItineraries function

  const sortedAndFilteredItineraries = React.useMemo(() => {
    let filtered = [...itineraries];
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
        // Default to date sort
        const dateA = new Date(a.uploaded_at).getTime();
        const dateB = new Date(b.uploaded_at).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });

    // Keep featured items at the top, respecting the current sort for other items
    filtered.sort((a, b) => {
        const aIsFeatured = a.type === 'packaged' && a.featured;
        const bIsFeatured = b.type === 'packaged' && b.featured;
        if (aIsFeatured && !bIsFeatured) return -1;
        if (!aIsFeatured && bIsFeatured) return 1;
        return 0;
    });

    return filtered;

  }, [itineraries, searchTerm, sortKey, sortDirection]);

  const handleDelete = async (id: string, title: string, type: 'packaged' | 'single') => {
    try {
      if (type === 'packaged') {
        await deleteItinerary(id);
      } else {
        await deleteResource(id);
      }
       toast({
        title: "Itinerary Deleted",
        description: `"${title}" has been successfully deleted.`,
      });
      // Optimistically update UI
      setItineraries(prev => prev.filter(it => it.id !== id));
    } catch (error) {
       console.error("Failed to delete itinerary", error);
       toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the itinerary. Please try again.",
      });
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/app/admin/resources/edit/${id}`);
  };

  if (isAuthLoading || !viewingUser) {
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
          <h1 className="text-3xl font-bold tracking-tight">Manage Itineraries</h1>
          <p className="text-muted-foreground">
            Add, edit, and manage both packaged and single itineraries.
          </p>
        </div>
        {canEdit && (
            <div className="flex gap-2">
                <Link href="/app/admin/resources/packaged-its/add-single">
                    <Button variant="outline">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Itinerary File
                    </Button>
                </Link>
                <Link href="/app/admin/resources/packaged-its/add">
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Packaged Itinerary
                    </Button>
                </Link>
            </div>
        )}
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

       {isLoading ? (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
       ) : sortedAndFilteredItineraries.length > 0 ? (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {sortedAndFilteredItineraries.map((itinerary) => {
            if (itinerary.type === 'packaged') {
              return <ItineraryCard key={itinerary.id} itinerary={itinerary} onDelete={() => handleDelete(itinerary.id, itinerary.title, 'packaged')} />;
            } else {
              // The single file itinerary is a standard Resource
              return <ResourceCard key={itinerary.id} resource={itinerary} onDelete={() => handleDelete(itinerary.id, itinerary.title, 'single')} onEdit={handleEdit} />;
            }
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center">
            <h3 className="text-xl font-semibold tracking-tight">No Itineraries Found</h3>
            <p className="text-muted-foreground mt-2 mb-4">
                Get started by adding your first itinerary.
            </p>
            {canEdit && (
                <Link href="/app/admin/resources/packaged-its/add">
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Packaged Itinerary
                    </Button>
                </Link>
            )}
        </div>
      )}
    </div>
  );
}

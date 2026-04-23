
"use client";

import * as React from 'react';
import { getResources, deleteResource } from "@/services/resource-service";
import type { Resource, Category } from '@/lib/types';
import { Loader2, PlusCircle, Search, ArrowDown, ArrowUp } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ResourceCard } from '@/components/ui/resource-card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/app/app/app-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DOWNLOAD_CATEGORIES: Category[] = ['how-to-get-there', 'brochures', 'factsheet', 'activity-sheets', 'spa-menu', 'images', 'videos'];

type SortKey = 'title' | 'uploaded_at' | 'category';
type SortDirection = 'asc' | 'desc';

export default function AdminDownloadsPage() {
  const [resources, setResources] = React.useState<Resource[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [resourceToDelete, setResourceToDelete] = React.useState<Resource | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { user: viewingUser, isLoading: isAuthLoading } = useAuth();
  
  const [sortKey, setSortKey] = React.useState<SortKey>('uploaded_at');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');

  React.useEffect(() => {
    if (!isAuthLoading && viewingUser && viewingUser.role === 'Agent') {
      router.replace('/app/agent/dashboard');
      return;
    }
  }, [viewingUser, isAuthLoading, router]);

  const canEdit = viewingUser?.role === 'Admin' || viewingUser?.role === 'Super Admin';

  const fetchResources = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const res = await getResources();
        setResources(res.filter(r => DOWNLOAD_CATEGORIES.includes(r.category)));
    } catch(e) {
        toast({
            variant: "destructive",
            title: "Error fetching resources",
            description: "Could not load data from the database."
        })
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const sortedAndFilteredResources = React.useMemo(() => {
    let filtered = [...resources];
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
  }, [searchTerm, resources, sortKey, sortDirection]);
  
  const handleDelete = async () => {
    if (!resourceToDelete) return;
    try {
      await deleteResource(resourceToDelete.id);
      toast({
        title: "Resource Deleted",
        description: `Successfully deleted "${resourceToDelete.title}".`,
      });
      fetchResources(); // Re-fetch to update the list
    } catch (error) {
      console.error("Failed to delete resource:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the resource. Please try again.",
      });
    } finally {
      setResourceToDelete(null);
    }
  };
  
  const handleEdit = (id: string) => {
    router.push(`/app/admin/resources/edit/${id}`);
  }
  
  const ResourceGrid = ({ resources }: { resources: Resource[] }) => (
    resources.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {resources.map(resource => (
                <ResourceCard 
                    key={resource.id} 
                    resource={resource} 
                    onEdit={canEdit ? handleEdit : undefined}
                    onDelete={canEdit ? () => setResourceToDelete(resource) : undefined}
                />
            ))}
        </div>
    ) : (
        <div className="text-center text-muted-foreground col-span-full py-12">
            No resources found.
        </div>
    )
  );

  if (isLoading || isAuthLoading) {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
       <AlertDialog open={!!resourceToDelete} onOpenChange={(isOpen) => !isOpen && setResourceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the resource &quot;{resourceToDelete?.title}&quot; and its associated file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className={buttonVariants({ variant: "destructive" })}>
              Yes, delete it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Downloads</h1>
            <p className="text-muted-foreground">
              Upload and manage downloadable resources like brochures and images for your agents.
            </p>
        </div>
        {canEdit && (
          <Link href="/app/admin/resources/downloads/add">
              <Button>
                  <PlusCircle className="mr-2 h-[18px] w-[18px]" />
                  Add New Resource
              </Button>
          </Link>
        )}
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
      
        {isLoading ? (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1 p-1 md:grid md:grid-cols-8">
              <TabsTrigger value="all">All</TabsTrigger>
              {DOWNLOAD_CATEGORIES.map(category => (
                <TabsTrigger key={category} value={category} className="capitalize px-4">
                    {category === 'activity-sheets' ? 'Activities' : category === 'how-to-get-there' ? 'How To Get There' : category.replace('-', ' ')}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="all" className="mt-4">
               <ResourceGrid resources={sortedAndFilteredResources} />
            </TabsContent>
            {DOWNLOAD_CATEGORIES.map(category => (
               <TabsContent key={category} value={category} className="mt-4">
                 <ResourceGrid resources={sortedAndFilteredResources.filter(r => r.category === category)} />
              </TabsContent>
            ))}
          </Tabs>
        )}
    </div>
  );
}

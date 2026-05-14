
"use client";

import * as React from 'react';
import { Button, buttonVariants } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { TrainingResourceTable } from "./training-resource-table";
import { getTrainingResources, deleteTrainingResource, importTrainingResources } from '@/services/training-resource-service';
import type { TrainingResource } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { DataMigrationButtons } from "@/components/admin/data-migration-buttons";
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
import { useRouter } from 'next/navigation';

export default function AdminTrainingPage() {
  const [resources, setResources] = React.useState<TrainingResource[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [resourceToDelete, setResourceToDelete] = React.useState<TrainingResource | null>(null);
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isAuthLoading && user && user.role === 'Agent') {
      router.replace('/app/agent/dashboard');
      return;
    }
  }, [user, isAuthLoading, router]);

  const fetchResources = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedResources = await getTrainingResources();
      setResources(fetchedResources);
    } catch (error) {
      console.error("Failed to fetch training resources:", error);
      toast({
        variant: "destructive",
        title: "Fetch Failed",
        description: "Could not load training resources from the database.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (!isAuthLoading && user) {
        fetchResources();
    }
  }, [fetchResources, user, isAuthLoading]);

  const handleDelete = async () => {
    if (!resourceToDelete) return;

    try {
      await deleteTrainingResource(resourceToDelete.id);
      toast({
        title: "Resource Deleted",
        description: `"${resourceToDelete.title}" has been successfully deleted.`,
      });
      setResourceToDelete(null);
      fetchResources(); // Refresh data
    } catch (error) {
      console.error("Failed to delete training resource:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the resource. Please try again.",
      });
    }
  };

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
              This action cannot be undone. This will permanently delete the training resource &quot;{resourceToDelete?.title}&quot; and its associated file.
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
          <h1 className="text-3xl font-bold tracking-tight">Manage Training Materials</h1>
          <p className="text-muted-foreground">
            Add, edit, and manage training materials for your agents.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DataMigrationButtons 
            data={resources} 
            onImport={async (importedData) => {
              const result = await importTrainingResources(importedData);
              fetchResources();
              return result;
            }} 
            entityName="Training" 
          />
          <Link href="/app/admin/resources/training/add">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Training Material
            </Button>
          </Link>
        </div>
      </div>

       {resources.length > 0 ? (
        <TrainingResourceTable resources={resources} onDeleteRequest={setResourceToDelete} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center">
            <h3 className="text-xl font-semibold tracking-tight">No Training Materials Found</h3>
            <p className="text-muted-foreground mt-2 mb-4">
                Get started by adding your first training resource.
            </p>
             <Link href="/app/admin/resources/training/add">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Training Material
                </Button>
            </Link>
        </div>
      )}
    </div>
  );
}

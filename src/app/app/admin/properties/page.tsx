
"use client";

import * as React from 'react';
import { getProperties, deleteProperty } from "@/services/property-service";
import { PropertyTable } from "./property-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Property } from '@/lib/types';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/app/app/app-provider';
import { useRouter } from 'next/navigation';

export default function AdminPropertiesPage() {
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [propertyToDelete, setPropertyToDelete] = React.useState<Property | null>(null);
  const { toast } = useToast();
  const { user: viewingUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isAuthLoading && viewingUser && viewingUser.role === 'Agent') {
      router.replace('/app/agent/dashboard');
      return;
    }
  }, [viewingUser, isAuthLoading, router]);

  const canEdit = viewingUser?.role === 'Admin' || viewingUser?.role === 'Super Admin';

  const fetchProperties = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const props = await getProperties();
      setProperties(props);
    } catch(e) {
      console.error("Failed to fetch properties", e)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load properties from the database.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (!isAuthLoading && viewingUser) {
      fetchProperties();
    }
  }, [fetchProperties, viewingUser, isAuthLoading]);

  const handleDelete = async () => {
    if (!propertyToDelete) return;
    try {
      await deleteProperty(propertyToDelete.id);
      toast({
        title: "Property Deleted",
        description: `Successfully deleted "${propertyToDelete.name}".`,
      });
      setPropertyToDelete(null);
      fetchProperties(); // Refresh data
    } catch (error) {
      console.error("Failed to delete property:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the property. Please try again.",
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
       <AlertDialog open={!!propertyToDelete} onOpenChange={(isOpen) => !isOpen && setPropertyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the property &quot;{propertyToDelete?.name}&quot; and all associated images from storage.
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
            <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
            <p className="text-muted-foreground">
                Manage your portfolio of hotels, lodges, and camps.
            </p>
        </div>
        {canEdit && (
            <Link href="/app/admin/properties/add">
                <Button>
                    <PlusCircle className="mr-2 h-[18px] w-[18px]" />
                    Add Property
                </Button>
            </Link>
        )}
      </div>
      
      <PropertyTable properties={properties} onDeleteRequest={setPropertyToDelete} />
      
    </div>
  );
}

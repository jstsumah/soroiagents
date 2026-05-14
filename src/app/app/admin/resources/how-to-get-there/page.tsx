
"use client";

import * as React from 'react';
import Image from 'next/image';
import { HowToGetThereTable } from "./how-to-get-there-table";
import { Info, PlusCircle, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { HowToGetThereClient } from "./how-to-get-there-client";
import type { HowToGetThereLocation } from '@/lib/types';
import { getLocations, deleteLocation, importLocations } from '@/services/how-to-get-there-service';
import { getCompanyDetails } from '@/services/settings-service';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/app/app/app-provider';
import { useRouter } from 'next/navigation';

export default function HowToGetTherePage() {
  const [locations, setLocations] = React.useState<HowToGetThereLocation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [locationToDelete, setLocationToDelete] = React.useState<HowToGetThereLocation | null>(null);
  const [flightRoutesImageUrl, setFlightRoutesImageUrl] = React.useState<string | undefined>('');
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isAuthLoading && user && user.role === 'Agent') {
      router.replace('/app/agent/dashboard');
      return;
    }
  }, [user, isAuthLoading, router]);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const [locationsData, companyDetails] = await Promise.all([
            getLocations(),
            getCompanyDetails()
        ]);
        setLocations(locationsData);
        setFlightRoutesImageUrl(companyDetails.flightRoutesImageUrl);
    } catch (error) {
        console.error("Failed to fetch data for How To Get There admin page:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load page data. Please try again later.",
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!locationToDelete) return;
    try {
      await deleteLocation(locationToDelete.id);
      toast({
        title: "Location Deleted",
        description: `Successfully deleted "${locationToDelete.name}".`,
      });
      setLocationToDelete(null);
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Failed to delete location:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the location. Please try again.",
      });
    }
  };

  if (isAuthLoading || !user) {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
       <AlertDialog open={!!locationToDelete} onOpenChange={(isOpen) => !isOpen && setLocationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the location entry for &quot;{locationToDelete?.name}&quot;.
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
            <h1 className="text-3xl font-bold tracking-tight">Manage &quot;How To Get There&quot;</h1>
            <p className="text-muted-foreground">
                Add, edit, and manage location travel information.
            </p>
        </div>
        <div className="flex items-center gap-4">
          <DataMigrationButtons 
            data={locations} 
            onImport={async (importedData) => {
              const result = await importLocations(importedData);
              fetchData();
              return result;
            }} 
            entityName="Locations" 
          />
          <Link href="/app/admin/resources/how-to-get-there/add">
              <Button>
                  <PlusCircle className="mr-2 h-[18px] w-[18px]" />
                  Add Location
              </Button>
          </Link>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <HowToGetThereTable locations={locations} onDeleteRequest={setLocationToDelete} />
      )}

      <div className="mt-8">
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Agent Preview</h2>
         <div className="text-center max-w-3xl mx-auto mb-6">
            <h1 className="text-3xl font-bold tracking-tight uppercase text-primary">Property Location</h1>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-base text-muted-foreground inline-flex items-center gap-2">
                <Info className="h-[18px] w-[18px] shrink-0" />
                <div>
                <p>For departure and arrival times please check directly with the airline or call our reservation office</p>
                </div>
            </div>
        </div>

        <div className="rounded-lg border border-dashed p-4">
            <HowToGetThereClient data={locations} flightRoutesImageUrl={flightRoutesImageUrl} />
        </div>
      </div>
    </div>
  );
}

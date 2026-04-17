
"use client";

import * as React from 'react';
import { getParkFees } from "@/services/park-fee-service";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlusCircle, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { ParkFeeTable } from "./park-fee-table";
import { Separator } from "@/components/ui/separator";
import type { ParkFee } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { deleteParkFee } from "@/services/park-fee-service";
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

export default function ParkFeesPage() {
  const [residentFees, setResidentFees] = React.useState<ParkFee[]>([]);
  const [nonResidentFees, setNonResidentFees] = React.useState<ParkFee[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [feeToDelete, setFeeToDelete] = React.useState<ParkFee | null>(null);
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isAuthLoading && user && user.role === 'Agent') {
      router.replace('/app/agent/dashboard');
      return;
    }
  }, [user, isAuthLoading, router]);

  const fetchFees = React.useCallback(async () => {
    setIsLoading(true);
    const allFees = await getParkFees();
    setResidentFees((allFees || []).filter(f => f.user_type === 'local'));
    setNonResidentFees((allFees || []).filter(f => f.user_type === 'international'));
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    fetchFees();
  }, [fetchFees]);
  
  const handleDelete = async () => {
    if (!feeToDelete) return;

    try {
      await deleteParkFee(feeToDelete.id);
      toast({
        title: "Park Fee Deleted",
        description: `The fee for ${feeToDelete.location} has been deleted.`,
      });
      setFeeToDelete(null);
      fetchFees(); // Refresh data
    } catch (error) {
      console.error("Failed to delete park fee:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the park fee. Please try again.",
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
       <AlertDialog open={!!feeToDelete} onOpenChange={(isOpen) => !isOpen && setFeeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the park fee entry for &quot;{feeToDelete?.location}&quot;.
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
          <h1 className="text-3xl font-bold tracking-tight">Manage Park Fees</h1>
          <p className="text-muted-foreground">
            Add, edit, and manage park fee information for different user types.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Resident Fees (KES)</h2>
          <Link href="/app/admin/resources/park-fees/add?type=local">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Resident Fee
            </Button>
          </Link>
        </div>
        <ParkFeeTable fees={residentFees} currency="KES" onDeleteRequest={setFeeToDelete} />
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Non-Resident Fees (USD)</h2>
          <Link href="/app/admin/resources/park-fees/add?type=international">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Non-Resident Fee
            </Button>
          </Link>
        </div>
        <ParkFeeTable fees={nonResidentFees} currency="USD" onDeleteRequest={setFeeToDelete} />
      </div>
    </div>
  );
}

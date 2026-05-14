"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { useAuth } from '../../app-provider';

interface CleanupResult {
    totalFilesChecked: number;
    orphansFound: number;
    deletedCount: number;
    errors: string[];
}

export function StorageCleanupForm() {
    const { user } = useAuth();
    const [isCleaning, setIsCleaning] = useState(false);
    const [result, setResult] = useState<CleanupResult | null>(null);
    const { toast } = useToast();

    // Strictly restrict to Super Admin on the frontend
    if (user?.role !== 'Super Admin') {
        return null;
    }

    const handleCleanup = async () => {
        setIsCleaning(true);
        setResult(null);

        try {
            const response = await fetch('/api/admin/maintenance/cleanup', {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to run cleanup');
            }

            setResult(data.result);
            toast({
                title: "Cleanup Complete",
                description: `Successfully removed ${data.result.deletedCount} orphaned files.`,
            });
        } catch (error: any) {
            console.error('Cleanup error:', error);
            toast({
                variant: "destructive",
                title: "Cleanup Failed",
                description: error.message || "An unexpected error occurred.",
            });
        } finally {
            setIsCleaning(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-lg font-medium">Storage Garbage Collection</h4>
                    <p className="text-sm text-muted-foreground">
                        Scans the storage bucket for files not linked to any database records and deletes them.
                    </p>
                </div>
                
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button 
                            variant="destructive" 
                            disabled={isCleaning}
                            className="shrink-0"
                        >
                            {isCleaning ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Scanning...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Run Cleanup
                                </>
                            )}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-3">
                                <p>
                                    This action will scan your entire storage bucket and **permanently delete** any files that are not referenced in the database.
                                </p>
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs">
                                    <p className="font-bold mb-1 flex items-center">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        MANDATORY BACKUP REMINDER
                                    </p>
                                    <p>
                                        Please ensure you have manually backed up your Supabase Storage bucket before proceeding. This action cannot be undone.
                                    </p>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={handleCleanup}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                I have a backup, proceed
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {result && (
                <Alert className={result.errors.length > 0 ? "border-amber-500 bg-amber-50/50" : "border-green-500 bg-green-50/50"}>
                    {result.errors.length > 0 ? (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                    ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    <AlertTitle>Results</AlertTitle>
                    <AlertDescription className="mt-2 text-sm">
                        <ul className="list-disc list-inside space-y-1">
                            <li>Files Scanned: <strong>{result.totalFilesChecked}</strong></li>
                            <li>Orphans Found: <strong>{result.orphansFound}</strong></li>
                            <li>Files Deleted: <strong>{result.deletedCount}</strong></li>
                            {result.errors.length > 0 && (
                                <li className="text-destructive font-semibold">Errors: {result.errors.length} (Check console for details)</li>
                            )}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}


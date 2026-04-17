

"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreVertical, PawPrint, Star, Loader2 } from "lucide-react";
import type { PackagedItinerary, TravelLink } from "@/lib/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { deleteItinerary } from "@/services/itinerary-service";
import ReactMarkdown from 'react-markdown';
import { useAuth } from "@/app/app/app-provider";
import { Badge } from "@/components/ui/badge";

interface ItineraryCardProps {
  itinerary: PackagedItinerary;
  onDelete: (id: string) => void;
}

export function ItineraryCard({ itinerary, onDelete }: ItineraryCardProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { user: viewingUser } = useAuth();
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isAlertOpen, setIsAlertOpen] = React.useState(false);
    const canEdit = viewingUser?.role === 'Admin' || viewingUser?.role === 'Super Admin';

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
          await deleteItinerary(itinerary.id);
          toast({
            title: "Itinerary Deleted",
            description: `"${itinerary.title}" has been successfully deleted.`,
          });
          onDelete(itinerary.id);
        } catch (error) {
          console.error("Failed to delete itinerary:", error);
          toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: "Could not delete the itinerary. Please try again.",
          });
        } finally {
          setIsDeleting(false);
          setIsAlertOpen(false);
        }
    };


    const renderLinkCell = (link: TravelLink) => {
        const url = link.value;
        const isValidLink = url && url.toUpperCase() !== 'N/A' && url.trim() !== '';
        
        return (
            <TableCell className="text-center">
                {isValidLink ? (
                    <Button variant="link" className="p-0 h-auto" asChild>
                        <a href={url} target="_blank" rel="noopener noreferrer" download={link.type === 'file'}>View</a>
                    </Button>
                ) : (
                    <span className="text-muted-foreground">N/A</span>
                )}
            </TableCell>
        );
    };

    return (
    <>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the itinerary &quot;{itinerary.title}&quot;.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className={buttonVariants({ variant: "destructive" })}>
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Yes, delete it
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        <Card className={cn("overflow-hidden", itinerary.featured && "border-primary border-2")}>
            <CardHeader className="bg-primary text-primary-foreground p-6 relative">
                 <div className="absolute top-4 left-4 flex items-center gap-2">
                    {itinerary.featured && (
                        <div title="Featured Package">
                            <Star className="h-4 w-4 text-primary-foreground" />
                            <span className="sr-only">Featured</span>
                        </div>
                    )}
                    {itinerary.isNetPackage && (
                        <Badge variant="destructive" className="text-xs font-bold" title="Net Package (Hidden from pending users)">NET</Badge>
                    )}
                 </div>
                 {canEdit && (
                    <div className="absolute top-4 right-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => router.push(`/app/admin/resources/packaged-its/edit/${itinerary.id}`)}>
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setIsAlertOpen(true)} className="text-destructive">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
                <CardTitle className="text-xl">{itinerary.title}</CardTitle>
                <CardDescription className="text-primary-foreground/90">{itinerary.commissionInfo}</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-6">
                    <PawPrint className="h-6 w-6 text-muted-foreground mt-1 shrink-0" />
                    <div>
                        <h3 className="text-lg font-semibold">{itinerary.description}</h3>
                        <div className="text-muted-foreground prose prose-sm max-w-none">
                            <ReactMarkdown>{itinerary.notes}</ReactMarkdown>
                        </div>
                    </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="font-bold text-foreground">Package</TableHead>
                                <TableHead className="text-center font-bold text-foreground">Drive-In</TableHead>
                                <TableHead className="text-center font-bold text-foreground">Fly-In</TableHead>
                                <TableHead className="text-center font-bold text-foreground">Rail Safari</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {itinerary.packages.map((pkg) => (
                                <TableRow key={pkg.name}>
                                    <TableCell className="font-medium">{pkg.name}</TableCell>
                                    {renderLinkCell(pkg.driveIn)}
                                    {renderLinkCell(pkg.flyIn)}
                                    {renderLinkCell(pkg.railSafari)}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </>
    );
}

    

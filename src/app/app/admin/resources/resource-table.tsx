
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { MoreHorizontal, Loader2 } from "lucide-react";
import type { Resource } from "@/lib/types";
import { TierBadge } from "@/components/ui/tier-badge";
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
import { useToast } from "@/hooks/use-toast";
import { deleteResource } from "@/services/resource-service";

export function ResourceTable({ resources: initialResources }: { resources: Resource[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [resources, setResources] = React.useState(initialResources);
  const [resourceToDelete, setResourceToDelete] = React.useState<Resource | null>(null);

  React.useEffect(() => {
    setResources(initialResources);
  }, [initialResources]);

  const handleDelete = async () => {
    if (!resourceToDelete) return;
    try {
      await deleteResource(resourceToDelete.id);
      setResources(prev => prev.filter(r => r.id !== resourceToDelete.id));
      toast({
        title: "Resource Deleted",
        description: `Successfully deleted "${resourceToDelete.title}".`,
      });
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
  
  const formatDate = (date: Date | string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  }

  return (
    <>
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
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary/90">
              <TableHead className="text-primary-foreground font-semibold">Title</TableHead>
              <TableHead className="text-primary-foreground font-semibold">Category</TableHead>
              <TableHead className="text-primary-foreground font-semibold">Access Tiers</TableHead>
              <TableHead className="text-primary-foreground font-semibold">Uploaded At</TableHead>
              <TableHead className="text-primary-foreground font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.length ? (
              resources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="font-medium">
                    <div className="font-medium">{resource.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">{resource.description}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{resource.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {resource.tier_access.map(tier => <TierBadge key={tier} tier={tier} />)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDate(resource.uploaded_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-[18px] w-[18px]" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/app/admin/resources/edit/${resource.id}`)}>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setResourceToDelete(resource)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No resources found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}


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
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import type { TrainingResource } from "@/lib/types";
import { TierBadge } from "@/components/ui/tier-badge";

interface TrainingResourceTableProps {
  resources: TrainingResource[];
  onDeleteRequest: (resource: TrainingResource) => void;
}

export function TrainingResourceTable({ resources, onDeleteRequest }: TrainingResourceTableProps) {
  const router = useRouter();
  
  const formatDate = (date: Date | string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  }

  return (
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
                <TableCell className="font-medium">{resource.title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{resource.category}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {resource.tier_access.map(tier => <TierBadge key={tier} tier={tier}/>)}
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
                      <DropdownMenuItem onClick={() => router.push(`/app/admin/resources/training/edit/${resource.id}`)}>Edit</DropdownMenuItem>
                       <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => onDeleteRequest(resource)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No training resources found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

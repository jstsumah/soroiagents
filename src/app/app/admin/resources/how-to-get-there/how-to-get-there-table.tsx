
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import type { HowToGetThereLocation } from "@/lib/types";

interface HowToGetThereTableProps {
  locations: HowToGetThereLocation[];
  onDeleteRequest: (location: HowToGetThereLocation) => void;
}

export function HowToGetThereTable({ locations, onDeleteRequest }: HowToGetThereTableProps) {
  const router = useRouter();

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary hover:bg-primary/90">
            <TableHead className="text-primary-foreground font-semibold">Location Name</TableHead>
            <TableHead className="text-primary-foreground font-semibold">Travel Options</TableHead>
            <TableHead className="text-right text-primary-foreground font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.length ? (
            locations.map((location) => (
              <TableRow key={location.id}>
                <TableCell className="font-medium">{location.name}</TableCell>
                <TableCell>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {location.flights.length > 0 && <span>{location.flights.length} Flight Route(s)</span>}
                        {location.trains.length > 0 && <span>{location.trains.length} Train Route(s)</span>}
                        {location.roads.length > 0 && <span>{location.roads.length} Road Route(s)</span>}
                    </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-[18px] w-[18px]" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => router.push(`/app/admin/resources/how-to-get-there/edit/${location.id}`)}>Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => onDeleteRequest(location)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                No locations found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

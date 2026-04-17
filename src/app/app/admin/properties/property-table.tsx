
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import type { Property } from "@/lib/types";
import { useAuth } from "@/app/app/app-provider";

interface PropertyTableProps {
  properties: Property[];
  onDeleteRequest: (property: Property) => void;
}

export function PropertyTable({ properties, onDeleteRequest }: PropertyTableProps) {
    const router = useRouter();
    const { user: viewingUser } = useAuth();
    const canEdit = viewingUser?.role === 'Admin' || viewingUser?.role === 'Super Admin';
  
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary hover:bg-primary/90">
            <TableHead className="hidden w-[100px] sm:table-cell text-primary-foreground font-semibold">Image</TableHead>
            <TableHead className="text-primary-foreground font-semibold">Name</TableHead>
            <TableHead className="text-primary-foreground font-semibold">Type</TableHead>
            <TableHead className="text-primary-foreground font-semibold">Location</TableHead>
            <TableHead className="text-primary-foreground font-semibold">Rooms</TableHead>
            <TableHead className="text-right text-primary-foreground font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.length ? (
            properties.map((property) => (
              <TableRow key={property.id}>
                <TableCell className="hidden sm:table-cell">
                  <Image
                    alt={property.name}
                    className="aspect-square rounded-md object-cover"
                    height="64"
                    src={property.images[0] || `https://picsum.photos/100/100`}
                    width="64"
                    referrerPolicy="no-referrer"
                    data-ai-hint="safari lodge"
                    unoptimized
                  />
                </TableCell>
                <TableCell className="font-medium">{property.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{property.type}</Badge>
                </TableCell>
                <TableCell>{property.location}</TableCell>
                <TableCell>{property.total_rooms}</TableCell>
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
                       <DropdownMenuItem onClick={() => router.push(`/app/admin/properties/${property.id}`)}>View Details</DropdownMenuItem>
                       {canEdit && <DropdownMenuItem onClick={() => router.push(`/app/admin/properties/edit/${property.id}`)}>Edit</DropdownMenuItem>}
                       {canEdit && <DropdownMenuSeparator />}
                       {canEdit && <DropdownMenuItem className="text-destructive" onClick={() => onDeleteRequest(property)}>Delete</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No properties found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

    

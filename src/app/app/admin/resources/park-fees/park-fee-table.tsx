
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
import type { ParkFee } from "@/lib/types";

interface ParkFeeTableProps {
  fees: ParkFee[];
  currency: 'KES' | 'USD';
  onDeleteRequest: (fee: ParkFee) => void;
}

export function ParkFeeTable({ fees, currency, onDeleteRequest }: ParkFeeTableProps) {
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-b hover:bg-muted/50">
            <TableHead className="bg-primary text-primary-foreground font-semibold">Location</TableHead>
            <TableHead className="bg-primary text-primary-foreground font-semibold">Fee Details</TableHead>
            <TableHead className="bg-primary text-right text-primary-foreground font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fees.length ? (
            fees.map((fee) => (
              <TableRow key={fee.id}>
                <TableCell className="font-medium">{fee.location}</TableCell>
                <TableCell>
                    <div className="flex flex-col gap-1">
                        {fee.fees.map(f => (
                           <div key={f.label}>
                             <span className="font-medium">{f.label}:</span> Adult: {formatCurrency(f.adult)}, Child: {formatCurrency(f.child)}
                           </div>
                        ))}
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
                      <DropdownMenuItem onClick={() => router.push(`/app/admin/resources/park-fees/edit/${fee.id}`)}>Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => onDeleteRequest(fee)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                No park fees found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

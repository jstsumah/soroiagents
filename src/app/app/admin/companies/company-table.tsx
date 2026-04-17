
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
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

type SortConfig = {
  key: keyof Company | null;
  direction: "ascending" | "descending";
};

interface CompanyTableProps {
  companies: Company[];
  onDeleteRequest: (company: Company) => void;
  onSort: (key: keyof Company) => void;
  sortConfig: SortConfig;
}

export function CompanyTable({ companies, onDeleteRequest, onSort, sortConfig }: CompanyTableProps) {
    const router = useRouter();

    const SortableHeader = ({ tKey, label }: { tKey: keyof Company, label: string }) => {
        const isSorted = sortConfig.key === tKey;
        return (
            <TableHead 
              className="text-primary-foreground font-semibold cursor-pointer hover:bg-accent/80 transition-colors"
              onClick={() => onSort(tKey)}
            >
              <div className="flex items-center gap-2">
                {label}
                <ArrowUpDown className={cn("h-4 w-4", isSorted ? "text-primary-foreground" : "text-primary-foreground/50")} />
              </div>
            </TableHead>
        )
    };
  
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary hover:bg-primary/90">
            <SortableHeader tKey="name" label="Name" />
            <SortableHeader tKey="phone" label="Phone" />
            <SortableHeader tKey="website_url" label="Website" />
            <SortableHeader tKey="city" label="City" />
            <SortableHeader tKey="country" label="Country" />
            <TableHead className="text-right text-primary-foreground font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.length ? (
            companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">
                  <Link href={`/app/admin/companies/view/${company.id}`} className="hover:underline">
                    {company.name}
                  </Link>
                </TableCell>
                 <TableCell>{company.phone || 'N/A'}</TableCell>
                <TableCell>
                  {company.website_url ? (
                    <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                      {company.website_url.replace(/^(https?:\/\/)?(www\.)?/,'')}
                    </a>
                  ) : 'N/A'}
                </TableCell>
                <TableCell>{company.city || 'N/A'}</TableCell>
                <TableCell>{company.country || 'N/A'}</TableCell>
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
                       <DropdownMenuItem onClick={() => router.push(`/app/admin/companies/view/${company.id}`)}>View Details</DropdownMenuItem>
                       <DropdownMenuItem onClick={() => router.push(`/app/admin/companies/edit/${company.id}`)}>Edit</DropdownMenuItem>
                       <DropdownMenuSeparator />
                       <DropdownMenuItem className="text-destructive" onClick={() => onDeleteRequest(company)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No companies found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

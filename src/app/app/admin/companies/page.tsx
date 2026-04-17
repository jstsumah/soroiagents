

"use client";

import * as React from 'react';
import { getCompanies, deleteCompany } from '@/services/company-service';
import { CompanyTable } from "./company-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlusCircle, Loader2, Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Company } from '@/lib/types';
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
import { Input } from '@/components/ui/input';
import { utils, writeFile } from 'xlsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SortConfig = {
  key: keyof Company | null;
  direction: "ascending" | "descending";
};

export default function AdminCompaniesPage() {
  const [allCompanies, setAllCompanies] = React.useState<Company[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [companyToDelete, setCompanyToDelete] = React.useState<Company | null>(null);
  const [textFilter, setTextFilter] = React.useState("");
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: "name", direction: "ascending" });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const { toast } = useToast();
  const { user: viewingUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const fetchCompanies = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const props = await getCompanies();
      setAllCompanies(props);
    } catch(e) {
      console.error("Failed to fetch companies", e)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load companies from the database.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (!isAuthLoading && viewingUser && viewingUser.role === 'Agent') {
      router.replace('/app/agent/dashboard');
      return;
    }
    
    if (!isAuthLoading && viewingUser) {
      fetchCompanies();
    }
  }, [fetchCompanies, viewingUser, isAuthLoading, router]);

  const handleDelete = async () => {
    if (!companyToDelete) return;
    try {
      await deleteCompany(companyToDelete.id);
      toast({
        title: "Company Deleted",
        description: `Successfully deleted "${companyToDelete.name}".`,
      });
      fetchCompanies(); // Refresh data
    } catch (error) {
      console.error("Failed to delete company:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the company. Please try again.",
      });
    } finally {
        setCompanyToDelete(null);
    }
  };

  const requestSort = (key: keyof Company) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const filteredCompanies = React.useMemo(() => {
    return allCompanies.filter(company => 
        company.name.toLowerCase().includes(textFilter.toLowerCase()) ||
        (company.country || '').toLowerCase().includes(textFilter.toLowerCase()) ||
        (company.city || '').toLowerCase().includes(textFilter.toLowerCase())
    );
  }, [allCompanies, textFilter]);

  const sortedCompanies = React.useMemo(() => {
    let sortableItems = [...filteredCompanies];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key!] || '';
        const valB = b[sortConfig.key!] || '';
        if (valA < valB) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredCompanies, sortConfig]);

  const paginatedCompanies = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedCompanies.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedCompanies, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedCompanies.length / itemsPerPage);

  const handleExport = (format: 'csv' | 'xlsx') => {
    const dataToExport = sortedCompanies.map(company => ({
      'Company Name': company.name,
      'Phone': company.phone,
      'Website': company.website_url,
      'Street Address': company.street_address,
      'City': company.city,
      'Country': company.country,
      'VAT No.': company.vat_no,
      'Company Reg No.': company.company_reg,
      'TRA License No.': company.tra_license,
    }));

    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Companies");
    const fileName = `company_export.${format}`;
    writeFile(workbook, fileName);
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
       <AlertDialog open={!!companyToDelete} onOpenChange={(isOpen) => !isOpen && setCompanyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the company &quot;{companyToDelete?.name}&quot;. Any users assigned to this company will need to be reassigned.
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
            <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
            <p className="text-muted-foreground">
                Manage all registered companies in the system.
            </p>
        </div>
        <Link href="/app/admin/companies/add">
            <Button>
                <PlusCircle className="mr-2 h-[18px] w-[18px]" />
                Add Company
            </Button>
        </Link>
      </div>

       <div className="flex items-center flex-wrap gap-4 py-4">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                placeholder="Filter by name, city, or country..."
                value={textFilter}
                onChange={(event) => setTextFilter(event.target.value)}
                className="w-full sm:w-auto sm:max-w-xs pl-10"
            />
        </div>
         <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export as</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport('csv')}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>XLSX</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
         </div>
      </div>
      
      <CompanyTable 
        companies={paginatedCompanies} 
        onDeleteRequest={setCompanyToDelete} 
        onSort={requestSort}
        sortConfig={sortConfig}
      />

       <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {paginatedCompanies.length} of {sortedCompanies.length} company(s) displayed.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                 <Select
                    value={`${itemsPerPage}`}
                    onValueChange={(value) => {
                        setItemsPerPage(Number(value))
                        setCurrentPage(1)
                    }}
                    >
                    <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue placeholder={itemsPerPage} />
                    </SelectTrigger>
                    <SelectContent side="top">
                        {[10, 20, 50, 100].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-[18px] w-[18px]" />
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                >
                    Next
                    <ChevronRight className="h-[18px] w-[18px]" />
                </Button>
            </div>
        </div>
      </div>
      
    </div>
  );
}

    

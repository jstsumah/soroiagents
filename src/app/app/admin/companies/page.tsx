

"use client";

import * as React from 'react';
import { getCompanies, deleteCompany, deleteCompanies } from '@/services/company-service';
import { CompanyTable } from "./company-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlusCircle, Loader2, Search, Download, ChevronLeft, ChevronRight, Upload, FileDown, Trash2 } from "lucide-react";
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
import { utils, writeFile, read } from 'xlsx';
import { importCompanies } from '@/services/company-service';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

type SortConfig = {
  key: keyof Company | null;
  direction: "ascending" | "descending";
};

export default function AdminCompaniesPage() {
  const [allCompanies, setAllCompanies] = React.useState<Company[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [companyToDelete, setCompanyToDelete] = React.useState<Company | null>(null);
  const [companiesToBulkDelete, setCompaniesToBulkDelete] = React.useState<Company[]>([]);
  const [textFilter, setTextFilter] = React.useState("");
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: "name", direction: "ascending" });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const { toast } = useToast();
  const { user: viewingUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importErrors, setImportErrors] = React.useState<{ company: Partial<Company>; error: string }[]>([]);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = React.useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = React.useState<Set<string>>(new Set());
  const MAX_IMPORT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

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

  const handleBulkDelete = async () => {
    if (companiesToBulkDelete.length === 0) return;
    try {
      const ids = companiesToBulkDelete.map(c => c.id);
      await deleteCompanies(ids);
      toast({
        title: `${companiesToBulkDelete.length} Company(ies) Deleted`,
        description: "Successfully deleted the selected companies.",
      });
      setCompaniesToBulkDelete([]);
      setSelectedCompanyIds(new Set());
      fetchCompanies();
    } catch (error) {
      console.error("Failed to delete companies:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the selected companies. Please try again.",
      });
    }
  };

  const openBulkDeleteDialog = (companies: Company[]) => {
    setCompaniesToBulkDelete(companies);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCompanyIds(new Set(paginatedCompanies.map(c => c.id)));
    } else {
      setSelectedCompanyIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedCompanyIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
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

  const handleDownloadTemplate = () => {
    const headers = ['name', 'phone', 'website_url', 'street_address', 'city', 'country', 'postal_address', 'zip_code', 'vat_no', 'company_reg', 'tra_license', 'dmc'];
    const sampleData = [{
      name: 'Acme Travel Ltd',
      phone: '+254712345678',
      website_url: 'https://acmetravel.com',
      street_address: '123 Business Park',
      city: 'Nairobi',
      country: 'Kenya',
      postal_address: 'P.O. Box 12345',
      zip_code: '00100',
      vat_no: 'VAT123456',
      company_reg: 'REG123456',
      tra_license: 'TRA123456',
      dmc: ''
    }];

    const worksheet = utils.json_to_sheet(sampleData, { header: headers });
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Company Template");
    writeFile(workbook, "company_import_template.csv");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const getColumnValue = (row: any, ...keys: string[]) => {
    for (const key of keys) {
      const lowerKey = key.toLowerCase();
      const rowKey = Object.keys(row).find(k => k.toLowerCase() === lowerKey);
      if (rowKey && row[rowKey] !== undefined && row[rowKey] !== '') {
        return row[rowKey];
      }
    }
    return undefined;
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: "The selected file exceeds the 10MB size limit. Please split it into smaller files.",
      });
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setImportErrors([]);
        setIsImporting(true);
        const data = e.target?.result;
        const workbook = read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = utils.sheet_to_json<any>(worksheet);

        toast({
          title: "Import Started",
          description: `Importing ${json.length} companies. Please wait.`,
        });

        const companiesToImport: Partial<Company>[] = json.map(row => ({
          name: getColumnValue(row, 'name', 'company name'),
          phone: getColumnValue(row, 'phone', 'telephone'),
          website_url: getColumnValue(row, 'website', 'website_url', 'url'),
          street_address: getColumnValue(row, 'street_address', 'address', 'street address'),
          city: getColumnValue(row, 'city', 'town'),
          country: getColumnValue(row, 'country'),
          postal_address: getColumnValue(row, 'postal_address', 'postal address', 'po_box', 'p.o. box'),
          zip_code: getColumnValue(row, 'zip_code', 'zipcode', 'postal_code', 'postal code'),
          vat_no: getColumnValue(row, 'vat_no', 'vat'),
          company_reg: getColumnValue(row, 'company_reg', 'company registration', 'reg_no'),
          tra_license: getColumnValue(row, 'tra_license', 'tra'),
          dmc: getColumnValue(row, 'dmc'),
        }));

        const result = await importCompanies(companiesToImport);

        let summary = '';
        const parts: string[] = [];
        
        if (result.successCount > 0) {
          parts.push(`${result.successCount} company(ies) imported successfully`);
        }
        if (result.skippedCount > 0) {
          parts.push(`${result.skippedCount} duplicate(s) skipped`);
        }
        if (result.errors.length > 0) {
          parts.push(`${result.errors.length} error(s)`);
          setImportErrors(result.errors);
        }
        
        summary = parts.join(', ');

        toast({
          title: "Import Complete",
          description: summary,
          variant: result.errors.length > 0 ? "destructive" : result.skippedCount > 0 ? "default" : "default",
          action: result.errors.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setIsErrorDialogOpen(true)}>
              View Errors
            </Button>
          ) : undefined,
          duration: result.errors.length > 0 ? 20000 : 5000,
        });

        fetchCompanies();
      } catch (error) {
        console.error("Error parsing or processing file:", error);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: "There was an error parsing the file. Please ensure it is a valid CSV or XLSX.",
        });
      } finally {
        setIsImporting(false);
        event.target.value = '';
      }
    };

    reader.readAsBinaryString(file);
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

      <AlertDialog open={companiesToBulkDelete.length > 0} onOpenChange={(isOpen) => !isOpen && setCompaniesToBulkDelete([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {companiesToBulkDelete.length} Company(ies)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The following companies will be permanently deleted: {companiesToBulkDelete.map(c => c.name).join(', ')}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCompaniesToBulkDelete([])}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className={buttonVariants({ variant: "destructive" })}>
               Yes, delete {companiesToBulkDelete.length} company(ies)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Company Import Errors</AlertDialogTitle>
            <AlertDialogDescription>
              The following companies could not be imported. Please correct the issues and try again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importErrors.map(({ company, error }, index) => (
                  <TableRow key={index}>
                    <TableCell>{(company as any).name || 'N/A'}</TableCell>
                    <TableCell>{error}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsErrorDialogOpen(false)}>Close</AlertDialogAction>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleDownloadTemplate} disabled={isImporting}>
                  <FileDown className="h-4 w-4" />
                  <span className="sr-only">Download Template</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download CSV Template</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleImportClick} disabled={isImporting}>
                  <Upload className="h-4 w-4" />
                  <span className="sr-only">Import Companies</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Import from CSV/XLSX</p>
              </TooltipContent>
            </Tooltip>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              className="hidden"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isImporting}>
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

      {isImporting && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing Companies
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Processing your file. This may take a moment...
              </p>
            </div>
          </div>
          <Progress 
            value={100}
            className="h-2"
          />
        </div>
      )}
      
      <CompanyTable
        companies={paginatedCompanies}
        onDeleteRequest={setCompanyToDelete}
        onSort={requestSort}
        sortConfig={sortConfig}
        selectedCompanyIds={selectedCompanyIds}
        onSelectAll={handleSelectAll}
        onSelectOne={handleSelectOne}
        onBulkDeleteRequest={openBulkDeleteDialog}
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

    

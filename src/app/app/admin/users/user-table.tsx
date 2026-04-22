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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { MoreHorizontal, ArrowUpDown, ChevronLeft, ChevronRight, Columns, Upload, Download, FileDown, Trash2, Calendar as CalendarIcon, X, Eye } from "lucide-react";
import type { User, Tier, Status, Role, UserType, Company } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { read, utils, writeFile } from 'xlsx';
import { TIERS } from "@/lib/constants";
import { getUser, updateUser, sendPasswordResetEmail, createUser, getUsers, sendActivationEmail } from "@/services/user-service";
import { getCompanies, getCompany } from "@/services/company-service";
import { deleteUser, adminSetUserPassword } from "@/services/admin-service";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addDays, format, subMonths, subYears } from "date-fns"
import { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";


const USER_TYPES: UserType[] = ['local', 'international'];
const STATUSES: Status[] = ['active', 'inactive', 'pending'];
const MAX_IMPORT_FILE_SIZE_MB = 10;
const MAX_IMPORT_FILE_SIZE_BYTES = MAX_IMPORT_FILE_SIZE_MB * 1024 * 1024;


type SortConfig = {
  key: keyof User | null;
  direction: "ascending" | "descending";
};

type ColumnVisibility = {
  [key in keyof User | 'actions']?: boolean;
}

export function UserTable({ users: initialUsers, viewingUser }: { users: User[], viewingUser: User }) {
  const router = useRouter();
  const [users, setUsers] = React.useState<User[]>(initialUsers);
  const [textFilter, setTextFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<UserType | 'all'>('all');
  const [tierFilter, setTierFilter] = React.useState<Tier | 'all'>('all');
  const [statusFilter, setStatusFilter] = React.useState<Status | 'all'>('all');
  const [approverFilter, setApproverFilter] = React.useState<string>('all');
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [activeDatePreset, setActiveDatePreset] = React.useState<string | null>(null);
  const [createdAtDateRange, setCreatedAtDateRange] = React.useState<DateRange | undefined>(undefined);
  const [activeCreatedAtPreset, setActiveCreatedAtPreset] = React.useState<string | null>(null);


  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: "created_at", direction: "descending" });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibility>({
    name: true,
    company: true,
    phone: true,
    tier: true,
    status: true,
    dmc: false,
    country: false,
    type: false,
    last_seen: false,
    role: false,
    created_at: false,
    approvedBy: false,
    remarks: false,
    actions: true,
  });
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>([]);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [usersToDelete, setUsersToDelete] = React.useState<User[]>([]);
  
  const [tierChangeConfirmation, setTierChangeConfirmation] = React.useState<{ user: User; newTier: Tier } | null>(null);

  // Company Detail Drawer State
  const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null);
  const [isCompanyDrawerOpen, setIsCompanyDrawerOpen] = React.useState(false);
  const [isFetchingCompany, setIsFetchingCompany] = React.useState(false);

  const openCompanyDetails = async (companyId: string) => {
    if (!companyId) return;
    setIsFetchingCompany(true);
    try {
        const company = await getCompany(companyId);
        if (company) {
            setSelectedCompany(company);
            setIsCompanyDrawerOpen(true);
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Company details not found."
            });
        }
    } catch (error) {
        console.error("Failed to fetch company details:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load company details."
        });
    } finally {
        setIsFetchingCompany(false);
    }
  };

  const [isImporting, setIsImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState<number | null>(null);
  const [importErrors, setImportErrors] = React.useState<{ user: any; error: string }[]>([]);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = React.useState(false);
  
  const [isSetPasswordDialogOpen, setIsSetPasswordDialogOpen] = React.useState(false);
  const [userForPasswordSet, setUserForPasswordSet] = React.useState<User | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [isSettingPassword, setIsSettingPassword] = React.useState(false);

  const userNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    (initialUsers || []).forEach(user => {
      map[user.uid] = user.name;
    });
    return map;
  }, [initialUsers]);

  const approvers = React.useMemo(() => {
    const adminNames = new Set<string>();
    (initialUsers || []).forEach(user => {
        if (user.approvedBy) {
            const name = userNameMap[user.approvedBy] || user.approvedBy;
            adminNames.add(name);
        }
    });
    return Array.from(adminNames).sort();
  }, [initialUsers, userNameMap]);

  const isFiltered = textFilter !== "" || typeFilter !== 'all' || tierFilter !== 'all' || statusFilter !== 'all' || !!dateRange || activeDatePreset === 'never' || !!createdAtDateRange || approverFilter !== 'all';

  const clearFilters = () => {
    setTextFilter("");
    setTypeFilter("all");
    setTierFilter("all");
    setStatusFilter("all");
    setDateRange(undefined);
    setActiveDatePreset(null);
    setCreatedAtDateRange(undefined);
    setActiveCreatedAtPreset(null);
    setApproverFilter("all");
  };

   const setDatePreset = (preset: string) => {
    const now = new Date();
    setActiveDatePreset(preset);
    switch (preset) {
      case "1m":
        setDateRange({ from: subMonths(now, 1), to: now });
        break;
      case "3m":
        setDateRange({ from: subMonths(now, 3), to: now });
        break;
      case "6m":
        setDateRange({ from: subMonths(now, 6), to: now });
        break;
      case "1y":
        setDateRange({ from: subYears(now, 1), to: now });
        break;
      case "never":
        setDateRange(undefined); // Clear date range for 'never'
        break;
      default:
        setDateRange(undefined);
        setActiveDatePreset(null);
    }
  };

  const setCreatedAtDatePreset = (preset: string) => {
    const now = new Date();
    setActiveCreatedAtPreset(preset);
    switch (preset) {
      case "1m":
        setCreatedAtDateRange({ from: subMonths(now, 1), to: now });
        break;
      case "3m":
        setCreatedAtDateRange({ from: subMonths(now, 3), to: now });
        break;
      case "6m":
        setCreatedAtDateRange({ from: subMonths(now, 6), to: now });
        break;
      case "1y":
        setCreatedAtDateRange({ from: subYears(now, 1), to: now });
        break;
      default:
        setCreatedAtDateRange(undefined);
        setActiveCreatedAtPreset(null);
    }
  };


  React.useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const openDeleteDialog = (users: User[]) => {
    setUsersToDelete(users);
    setIsAlertOpen(true);
  };


  const handleStatusChange = async (userToUpdate: User, status: Status) => {
    console.log('[handleStatusChange] uid=', userToUpdate.uid, 'new status=', status, 'old status=', userToUpdate.status);
    const updatePayload: Partial<User> = { status };
    if (status === 'active' && userToUpdate.status !== 'active') {
        updatePayload.approvedBy = viewingUser.name;
        updatePayload.approvedAt = new Date();
    }

    try {
      console.log('[handleStatusChange] updatePayload=', updatePayload);
      const result = await updateUser(userToUpdate.uid, updatePayload);
      console.log('[handleStatusChange] result=', result);
      // Refetch all users to get the updated approvedBy field
      const updatedUsers = await getUsers();
      setUsers((updatedUsers || []).filter(u => viewingUser?.role === 'Super Admin' || u.role !== 'Super Admin'));
      
      if (status === 'active' && userToUpdate.status !== 'active') {
          await sendActivationEmail(userToUpdate);
          toast({
            title: "User Activated",
            description: `An activation email has been sent to ${userToUpdate.email}.`
          });
      } else {
           toast({
            title: "Status Updated",
            description: `User status has been changed to ${status}.`,
          });
      }
    } catch (error: any) {
      console.error("Failed to update status:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Could not update user status.",
      });
    }
  };


  const handleTierChange = async (uid: string, tier: Tier) => {
    try {
      await updateUser(uid, { tier });
      setUsers(users.map(user => user.uid === uid ? { ...user, tier } : user));
      toast({
        title: "Tier Updated",
        description: `User tier has been changed to ${tier}.`,
      });
    } catch (error) {
      console.error("Failed to update tier:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update user tier.",
      });
    } finally {
        setTierChangeConfirmation(null);
    }
  };

  const handleBulkUpdate = async (field: 'status' | 'tier', value: Status | Tier) => {
    const updatePayload: Partial<User> = { [field]: value };
     // Note: approved_by/approved_at are set automatically by updateUser when status === 'active'

    const updatePromises = selectedUsers.map(uid => updateUser(uid, updatePayload));
    try {
        await Promise.all(updatePromises);
        // Refetch all users to get updated approvedBy fields if status was changed
        const updatedUsers = await getUsers();
        setUsers((updatedUsers || []).filter(u => viewingUser?.role === 'Super Admin' || u.role !== 'Super Admin'));

        toast({
            title: "Bulk Update Successful",
            description: `${selectedUsers.length} users have been updated.`
        });
        setSelectedUsers([]);
    } catch (error) {
        console.error(`Failed to bulk update ${field}:`, error);
        toast({
            variant: "destructive",
            title: "Bulk Update Failed",
            description: `Could not update ${field} for the selected users.`,
        });
    }
  }
  
  const attemptTierChange = (user: User, newTier: Tier) => {
    if (newTier === 'Platinum' && viewingUser.role !== 'Super Admin') {
        toast({
            variant: "destructive",
            title: "Permission Denied",
            description: "Only Super Admins can assign the Platinum tier.",
        });
        return;
    }
    const colleagues = (users || []).filter(u => u.company === user.company && u.uid !== user.uid);
    if (colleagues.length > 0) {
        const isMixedTier = colleagues.some(c => c.tier !== newTier);
        if (isMixedTier) {
            setTierChangeConfirmation({ user, newTier });
            return;
        }
    }
    // If no colleagues or all colleagues have the same new tier, proceed without confirmation.
    handleTierChange(user.uid, newTier);
  };

  const handleResetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(email);
      toast({
        title: "Password Reset Email Sent",
        description: `A password reset link has been sent to ${email}.`,
      });
    } catch (error) {
      console.error("Failed to send password reset:", error);
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: "Could not send password reset email.",
      });
    }
  };

  const handleResendActivation = async (user: User) => {
    try {
      await sendActivationEmail(user);
      toast({
        title: "Activation Email Sent",
        description: `An activation email has been re-sent to ${user.email}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: error.message || "Could not resend the activation email.",
      });
    }
  };

  const handleSetPassword = async () => {
    if (!userForPasswordSet || !newPassword) return;
    if (newPassword.length < 8) {
        toast({
            variant: "destructive",
            title: "Invalid Password",
            description: "Password must be at least 8 characters long.",
        });
        return;
    }

    setIsSettingPassword(true);
    try {
        await adminSetUserPassword(userForPasswordSet.uid, newPassword);
        toast({
            title: "Password Updated",
            description: `Successfully set a new password for ${userForPasswordSet.name}. They will be required to change it on their next login.`,
        });
        setIsSetPasswordDialogOpen(false);
        setNewPassword("");
        setUserForPasswordSet(null);
    } catch (error: any) {
        console.error("Failed to set password:", error);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: error.message || "Could not set user password.",
        });
    } finally {
        setIsSettingPassword(false);
    }
  };
  
  const handleDeleteUsers = async () => {
    if (usersToDelete.length === 0) return;

    const deletionPromises = usersToDelete.map(user => deleteUser(user.uid));
    
    try {
      await Promise.all(deletionPromises);
      
      setUsers(currentUsers => (currentUsers || []).filter(u => !usersToDelete.some(du => du.uid === u.uid)));
      setSelectedUsers([]); // Clear selection
      
      toast({
        title: `${usersToDelete.length} User(s) Deleted`,
        description: `Successfully deleted the selected user accounts.`,
      });
    } catch (error) {
       console.error("Failed to delete one or more users:", error);
       toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Could not delete some or all of the selected users.",
      });
    } finally {
        setUsersToDelete([]);
        setIsAlertOpen(false);
    }
  };


  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: `The selected file exceeds the ${MAX_IMPORT_FILE_SIZE_MB}MB size limit. Please split it into smaller files.`,
      });
      event.target.value = ''; // Clear the input
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setImportErrors([]);
        setIsImporting(true);
        setImportProgress(0);
        const data = e.target?.result;
        const workbook = read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = utils.sheet_to_json<any>(worksheet);

        toast({
            title: "Import Started",
            description: `Importing ${json.length} users. Please wait.`,
        });

        let successCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let errorsCount = 0;
        let errors: { user: any; error: string }[] = [];

        const getColumnValue = (row: any, ...keys: string[]) => {
            for (const key of keys) {
                const lowerKey = key.toLowerCase();
                const rowKey = Object.keys(row).find(k => k.toLowerCase() === lowerKey);
                if (rowKey && row[rowKey]) {
                    return row[rowKey];
                }
            }
            return undefined;
        };

        for (const [index, row] of json.entries()) {
            try {
                const email = getColumnValue(row, 'email', 'e-mail', 'email address');
                const password = getColumnValue(row, 'password') || 'password123';
                const name = getColumnValue(row, 'name', 'full name');
                const companyName = getColumnValue(row, 'company', 'company name');
                const createdAtRaw = getColumnValue(row, 'created_at', 'date', 'signup date', 'created');

                if (!email || !name || !companyName) {
                    throw new Error("Missing required fields (email, name, company).");
                }
                
                let created_at: Date | undefined = undefined;
                if (createdAtRaw) {
                    const parsedDate = new Date(createdAtRaw);
                    if (!isNaN(parsedDate.getTime())) {
                        created_at = parsedDate;
                    }
                }
                
                const result = await createUser({
                    email,
                    password,
                    name,
                    company: companyName,
                    created_at,
                    tier: getColumnValue(row, 'tier') || 'Brass',
                    status: getColumnValue(row, 'status') || 'pending',
                    type: getColumnValue(row, 'type') || 'local',
                    dmc: getColumnValue(row, 'dmc') || '',
                    phone: getColumnValue(row, 'phone', 'telephone', 'mobile') || '',
                    country: getColumnValue(row, 'country') || '',
                    passwordResetRequired: true,
                }, true); // Pass true for patchIfExists

                if (result.updated) {
                    updatedCount++;
                } else if (result.alreadyExists) {
                    skippedCount++;
                } else {
                    successCount++;
                }
            } catch (userError: any) {
                errorsCount++;
                errors.push({ user: row, error: userError.message });
            }
            setImportProgress(((index + 1) / json.length) * 100);
            
            // Artificial delay to make progress visible if processing is too fast
            // if (json.length < 10) await new Promise(r => setTimeout(r, 100));
        }
        
        let summaryParts = [];
        if (successCount > 0) summaryParts.push(`${successCount} new user(s) created`);
        if (updatedCount > 0) summaryParts.push(`${updatedCount} user(s) updated with new info`);
        if (skippedCount > 0) summaryParts.push(`${skippedCount} duplicate(s) skipped`);
        if (errorsCount > 0) summaryParts.push(`${errorsCount} error(s)`);
        
        const summary = summaryParts.join(', ') || "No users were imported.";
        if (errors.length > 0) {
          setImportErrors(errors);
        }

        toast({
          title: "Import Complete",
          description: summary,
          variant: errors.length > 0 ? "destructive" : "default",
          action: errors.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setIsErrorDialogOpen(true)}>
              View Errors
            </Button>
          ) : undefined,
          duration: errors.length > 0 ? 20000 : 5000,
        });

        // Refresh user list after import
        const allUsers = await getUsers();
        setUsers((allUsers || []).filter(u => viewingUser?.role === 'Super Admin' || u.role !== 'Super Admin'));

      } catch (error) {
        console.error("Error parsing or processing file:", error);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: "There was an error parsing the file. Please ensure it is a valid CSV or XLSX.",
        });
      } finally {
        setIsImporting(false);
        setImportProgress(null);
      }
    };

    reader.readAsBinaryString(file);
    
    event.target.value = '';
  };
  
  const handleExport = (format: 'csv' | 'xlsx') => {
    const dataToExport = sortedUsers.map(user => ({
      Name: user.name,
      Email: user.email,
      Phone: user.phone,
      Company: user.company,
      DMC: user.dmc,
      Country: user.country,
      Type: user.type,
      Tier: user.tier,
      Status: user.status,
      Role: user.role,
      'Created At': user.created_at ? new Date(user.created_at).toLocaleDateString() : '',
      'Last Seen': user.last_seen ? new Date(user.last_seen).toLocaleString() : 'Never',
    }));

    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Users");
    const fileName = `user_export.${format}`;
    writeFile(workbook, fileName);
  };

  const handleDownloadTemplate = () => {
    const headers = ['name', 'email', 'password', 'company', 'type', 'tier', 'status', 'dmc'];
    const sampleData = [{
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      password: 'strongPassword123',
      company: 'Travel Co.',
      type: 'international',
      tier: 'Gold',
      status: 'pending',
      dmc: 'Global Tours'
    }];

    const worksheet = utils.json_to_sheet(sampleData, { header: headers });
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "User Template");
    writeFile(workbook, "user_import_template.csv");
  };


  const requestSort = (key: keyof User) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
     setCurrentPage(1);
  };

  const filteredUsers = React.useMemo(() => {
    return (users || []).filter(user => {
      const textMatch = user.name.toLowerCase().includes(textFilter.toLowerCase()) ||
                        user.email.toLowerCase().includes(textFilter.toLowerCase());
      const typeMatch = typeFilter === 'all' || user.type === typeFilter;
      const tierMatch = tierFilter === 'all' || user.tier === tierFilter;
      const statusMatch = statusFilter === 'all' || user.status === statusFilter;
      const approverMatch = approverFilter === 'all' || user.approvedBy === approverFilter || (user.approvedBy && userNameMap[user.approvedBy] === approverFilter);
      
      let dateMatch = true;
      if (activeDatePreset === 'never') {
        dateMatch = !user.last_seen;
      } else if (dateRange?.from) {
        if (!user.last_seen) {
          dateMatch = false; 
        } else {
          const userDate = new Date(user.last_seen);
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);

          const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
          toDate.setHours(23, 59, 59, 999);
          
          dateMatch = userDate >= fromDate && userDate <= toDate;
        }
      }

      let createdAtDateMatch = true;
      if (createdAtDateRange?.from) {
        if (!user.created_at) {
          createdAtDateMatch = false;
        } else {
            const userDate = new Date(user.created_at);
            const fromDate = new Date(createdAtDateRange.from);
            fromDate.setHours(0, 0, 0, 0);

            const toDate = createdAtDateRange.to ? new Date(createdAtDateRange.to) : new Date(createdAtDateRange.from);
            toDate.setHours(23, 59, 59, 999);

            createdAtDateMatch = userDate >= fromDate && userDate <= toDate;
        }
      }

      return textMatch && typeMatch && tierMatch && statusMatch && dateMatch && createdAtDateMatch && approverMatch;
    });
  }, [users, textFilter, typeFilter, tierFilter, statusFilter, dateRange, activeDatePreset, createdAtDateRange, approverFilter, userNameMap]);

  const sortedUsers = React.useMemo(() => {
    let sortableItems = [...filteredUsers];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key]! < b[sortConfig.key]!) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key]! > b[sortConfig.key]!) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredUsers, sortConfig]);

  const paginatedUsers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  const SortableHeader = ({ tKey, label }: { tKey: keyof User, label: string }) => (
    <TableHead 
      className="text-primary-foreground font-semibold cursor-pointer hover:bg-accent/80 transition-colors"
      onClick={() => requestSort(tKey)}
    >
      <div className="flex items-center gap-2">
        {label}
        <ArrowUpDown className="h-4 w-4 ml-2" />
      </div>
    </TableHead>
  );

  const columnConfig = {
    name: { label: 'User', sortable: true },
    company: { label: 'Company', sortable: true },
    dmc: { label: 'DMC', sortable: true },
    country: { label: 'Country', sortable: true },
    phone: { label: 'Phone', sortable: false },
    type: { label: 'Type', sortable: true },
    tier: { label: 'Tier', sortable: true },
    status: { label: 'Status', sortable: false },
    approvedBy: { label: 'Approved by', sortable: true },
    last_seen: { label: 'Last Seen', sortable: true },
    role: { label: 'Role', sortable: true },
    created_at: { label: 'Created At', sortable: true },
    remarks: { label: 'Remarks', sortable: false },
    actions: { label: 'Actions', sortable: false },
  };
  
  const statusVariant = (status: Status) => {
    switch (status) {
        case 'active':
            return 'default';
        case 'inactive':
            return 'destructive';
        case 'pending':
            return 'accent';
        default:
            return 'outline';
    }
  }
  
  const isSuperAdmin = viewingUser?.role === 'Super Admin';
  const isAdmin = viewingUser?.role === 'Admin' || isSuperAdmin;
  const canDelete = isAdmin;
  const canManage = isAdmin || viewingUser?.canViewUsers;
  
  const availableTiers = React.useMemo(() => {
    if (isSuperAdmin) {
      return TIERS;
    }
    return TIERS.filter(t => t !== 'Platinum');
  }, [isSuperAdmin]);


  const handleSelectAll = (checked: boolean) => {
    if (checked) {
        setSelectedUsers(paginatedUsers.map(u => u.uid));
    } else {
        setSelectedUsers([]);
    }
  };

  const handleSelectOne = (uid: string, checked: boolean) => {
    if (checked) {
        setSelectedUsers(prev => [...prev, uid]);
    } else {
        setSelectedUsers(prev => prev.filter(id => id !== uid));
    }
  };


  return (
    <div className="w-full">
       <div className="flex items-center flex-wrap gap-4 py-4">
        <Input
          placeholder="Filter by name or email..."
          value={textFilter}
          onChange={(event) => {
            setTextFilter(event.target.value)
            setCurrentPage(1)
          }}
          className="w-full sm:w-auto sm:max-w-xs"
        />
         <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as UserType | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {USER_TYPES.map(type => <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={tierFilter} onValueChange={(value) => setTierFilter(value as Tier | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            {TIERS.map(tier => <SelectItem key={tier} value={tier}>{tier}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as Status | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(status => <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>)}
          </SelectContent>
        </Select>
        
        {isAdmin && (
            <Select value={approverFilter} onValueChange={(value) => setApproverFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Approver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Approvers</SelectItem>
                {approvers.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
        )}

        <Popover>
            <PopoverTrigger asChild>
                <Button
                    id="last-seen-date-picker"
                    variant={"outline"}
                    className={cn(
                        "w-[260px] justify-start text-left font-normal",
                        !dateRange && !activeDatePreset && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {
                        activeDatePreset === 'never' ? 'Never logged in' :
                        activeDatePreset === '1m' ? 'Last month' :
                        activeDatePreset === '3m' ? 'Last 3 months' :
                        activeDatePreset === '6m' ? 'Last 6 months' :
                        activeDatePreset === '1y' ? 'Last year' :
                        dateRange?.from ? (
                            dateRange.to ? (
                                `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
                            ) : (
                                format(dateRange.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Last Seen</span>
                        )
                    }
                </Button>
            </PopoverTrigger>
            <PopoverContent className="flex w-auto p-0" align="start">
                <div className="flex flex-col space-y-1 p-2 border-r">
                    <Button variant={activeDatePreset === '1m' ? 'secondary' : 'ghost'} className="justify-start px-2 h-8" onClick={() => setDatePreset("1m")}>Last month</Button>
                    <Button variant={activeDatePreset === '3m' ? 'secondary' : 'ghost'} className="justify-start px-2 h-8" onClick={() => setDatePreset("3m")}>Last 3 months</Button>
                    <Button variant={activeDatePreset === '6m' ? 'secondary' : 'ghost'} className="justify-start px-2 h-8" onClick={() => setDatePreset("6m")}>Last 6 months</Button>
                    <Button variant={activeDatePreset === '1y' ? 'secondary' : 'ghost'} className="justify-start px-2 h-8" onClick={() => setDatePreset("1y")}>Last year</Button>
                    <Separator className="my-1" />
                    <Button variant={activeDatePreset === 'never' ? 'secondary' : 'ghost'} className="justify-start px-2 h-8" onClick={() => setDatePreset("never")}>Never logged in</Button>
                </div>
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => {
                        setDateRange(range);
                        setActiveDatePreset(null);
                    }}
                    numberOfMonths={1}
                />
            </PopoverContent>
        </Popover>

        <Popover>
            <PopoverTrigger asChild>
                <Button
                    id="created-at-date-picker"
                    variant={"outline"}
                    className={cn(
                        "w-[260px] justify-start text-left font-normal",
                        !createdAtDateRange && !activeCreatedAtPreset && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {
                        activeCreatedAtPreset === '1m' ? 'Last month' :
                        activeCreatedAtPreset === '3m' ? 'Last 3 months' :
                        activeCreatedAtPreset === '6m' ? 'Last 6 months' :
                        activeCreatedAtPreset === '1y' ? 'Last year' :
                        createdAtDateRange?.from ? (
                            createdAtDateRange.to ? (
                                `${format(createdAtDateRange.from, "LLL dd, y")} - ${format(createdAtDateRange.to, "LLL dd, y")}`
                            ) : (
                                format(createdAtDateRange.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Created At</span>
                        )
                    }
                </Button>
            </PopoverTrigger>
            <PopoverContent className="flex w-auto p-0" align="start">
                <div className="flex flex-col space-y-1 p-2 border-r">
                    <Button variant={activeCreatedAtPreset === '1m' ? 'secondary' : 'ghost'} className="justify-start px-2 h-8" onClick={() => setCreatedAtDatePreset("1m")}>Last month</Button>
                    <Button variant={activeCreatedAtPreset === '3m' ? 'secondary' : 'ghost'} className="justify-start px-2 h-8" onClick={() => setCreatedAtDatePreset("3m")}>Last 3 months</Button>
                    <Button variant={activeCreatedAtPreset === '6m' ? 'secondary' : 'ghost'} className="justify-start px-2 h-8" onClick={() => setCreatedAtDatePreset("6m")}>Last 6 months</Button>
                    <Button variant={activeCreatedAtPreset === '1y' ? 'secondary' : 'ghost'} className="justify-start px-2 h-8" onClick={() => setCreatedAtDatePreset("1y")}>Last year</Button>
                </div>
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={createdAtDateRange?.from}
                    selected={createdAtDateRange}
                    onSelect={(range) => {
                        setCreatedAtDateRange(range);
                        setActiveCreatedAtPreset(null);
                    }}
                    numberOfMonths={1}
                />
            </PopoverContent>
        </Popover>

        {isFiltered && (
            <Button variant="ghost" onClick={clearFilters} className="h-10 px-3">
                <X className="mr-2 h-4 w-4" />
                Clear
            </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
            {isAdmin && (
                <>
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
                                <span className="sr-only">Import Users</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Import Users from CSV/XLSX</p>
                        </TooltipContent>
                    </Tooltip>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileImport}
                        className="hidden" 
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    />
                </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" disabled={isImporting}>
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Export Users</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export as</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport('csv')}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>XLSX</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                <Columns className="mr-2 h-[18px] w-[18px]" />
                Columns
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {Object.entries(columnConfig).map(([key, { label }]) => {
                  if ((key === 'role' || key === 'remarks' || key === 'approvedBy') && !isAdmin) return null;
                  return (
                    <DropdownMenuCheckboxItem
                        key={key}
                        className="capitalize"
                        checked={columnVisibility[key as keyof ColumnVisibility]}
                        onCheckedChange={(value) =>
                        setColumnVisibility((prev) => ({ ...prev, [key]: !!value }))
                        }
                    >
                        {label}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <AlertDialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>User Import Errors</AlertDialogTitle>
            <AlertDialogDescription>
              The following users could not be imported. Please correct the issues and try again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importErrors.map(({ user, error }, index) => (
                  <TableRow key={index}>
                    <TableCell>{user.email || 'N/A'}</TableCell>
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
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the selected ${usersToDelete.length} user account(s) and remove their data from our servers.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUsersToDelete([])}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUsers} className={buttonVariants({ variant: "destructive" })}>
                Yes, delete user(s)
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!tierChangeConfirmation} onOpenChange={(isOpen) => !isOpen && setTierChangeConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Tier Change</AlertDialogTitle>
            <AlertDialogDescription>
              This user&apos;s colleagues are on a different tier. Changing this user to <strong>{tierChangeConfirmation?.newTier}</strong> will result in a tier mismatch within the company. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTierChangeConfirmation(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => tierChangeConfirmation && handleTierChange(tierChangeConfirmation.user.uid, tierChangeConfirmation.newTier)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isSetPasswordDialogOpen} onOpenChange={setIsSetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set User Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{userForPasswordSet?.name}</strong>. The user will be required to change this password upon their next login.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 8 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSetPasswordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSetPassword} disabled={isSettingPassword || !newPassword || newPassword.length < 8}>
              {isSettingPassword ? "Setting..." : "Set Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border bg-card">
          {isImporting && importProgress !== null ? (
            <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-md text-sm">
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Importing Users...</span>
                  <span className="text-muted-foreground">{Math.round(importProgress)}%</span>
                </div>
                <Progress value={importProgress} className="h-2" />
              </div>
            </div>
          ) : (selectedUsers.length > 0 && (
            <div className="flex items-center flex-wrap gap-4 bg-muted/50 p-2 text-sm text-muted-foreground">
                <div className="flex-1 px-2">
                    {selectedUsers.length} of {sortedUsers.length} user(s) selected.
                </div>
                {isAdmin && (
                    <>
                        <div className="flex items-center gap-2">
                            <Select onValueChange={(value) => handleBulkUpdate('status', value as Status)}>
                                <SelectTrigger className="h-8 w-auto text-xs">
                                    <SelectValue placeholder="Change Status..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                           {isSuperAdmin && (
                             <Select onValueChange={(value) => handleBulkUpdate('tier', value as Tier)}>
                                <SelectTrigger className="h-8 w-auto text-xs">
                                    <SelectValue placeholder="Change Tier..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableTiers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                           )}
                        </div>
                        {canDelete && (
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                className="ml-auto"
                                onClick={() => openDeleteDialog(users.filter(u => selectedUsers.includes(u.uid)))}
                            >
                                <Trash2 className="mr-2 h-4 w-4"/>
                                Delete ({selectedUsers.length})
                            </Button>
                        )}
                    </>
                )}
            </div>
        ))}
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary">
                {isAdmin && (
                    <TableHead className="pl-4 text-primary-foreground font-semibold">
                        <Checkbox
                            checked={paginatedUsers.length > 0 && selectedUsers.length === paginatedUsers.length}
                            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                            aria-label="Select all"
                            className="border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary"
                        />
                    </TableHead>
                )}
              {columnVisibility.name && <SortableHeader tKey="name" label="User" />}
              {columnVisibility.company && <SortableHeader tKey="company" label="Company" />}
              {columnVisibility.dmc && <SortableHeader tKey="dmc" label="DMC" />}
              {columnVisibility.country && <SortableHeader tKey="country" label="Country" />}
              {columnVisibility.phone && <TableHead className="text-primary-foreground font-semibold">Phone</TableHead>}
              {columnVisibility.type && <SortableHeader tKey="type" label="Type" />}
              {columnVisibility.tier && <TableHead className="text-primary-foreground font-semibold hover:bg-accent/80 transition-colors">Tier</TableHead>}
              {columnVisibility.status && <TableHead className="text-primary-foreground font-semibold hover:bg-accent/80 transition-colors">Status</TableHead>}
              {isAdmin && columnVisibility.approvedBy && <SortableHeader tKey="approvedBy" label="Approved by" />}
              {columnVisibility.last_seen && <SortableHeader tKey="last_seen" label="Last Seen" />}
              {columnVisibility.role && isAdmin && <SortableHeader tKey="role" label="Role" />}
              {columnVisibility.created_at && <SortableHeader tKey="created_at" label="Created At" />}
              {isAdmin && columnVisibility.remarks && <TableHead className="text-primary-foreground font-semibold">Remarks</TableHead>}
              {columnVisibility.actions && <TableHead className="text-primary-foreground font-semibold hover:bg-accent/80 transition-colors text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.length ? (
              paginatedUsers.map((user) => (
                <TableRow key={user.uid} data-state={selectedUsers.includes(user.uid) && "selected"}>
                  {isAdmin && (
                    <TableCell className="pl-4">
                        <Checkbox
                            checked={selectedUsers.includes(user.uid)}
                            onCheckedChange={(checked) => handleSelectOne(user.uid, checked as boolean)}
                            aria-label="Select row"
                        />
                    </TableCell>
                  )}
                  {columnVisibility.name && <TableCell className="font-medium">
                    <Link href={`/app/admin/users/${user.uid}`} className="font-medium hover:underline">{user.name}</Link>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </TableCell>}
                  {columnVisibility.company && (
                    <TableCell>
                        {user.companyId ? (
                            <button 
                                onClick={() => openCompanyDetails(user.companyId!)}
                                className="text-primary hover:underline text-left font-medium"
                                disabled={isFetchingCompany}
                            >
                                {user.company}
                            </button>
                        ) : (
                            <span className="text-muted-foreground">{user.company || 'N/A'}</span>
                        )}
                    </TableCell>
                  )}
                  {columnVisibility.dmc && <TableCell>{user.type === 'local' ? 'N/A' : user.dmc}</TableCell>}
                  {columnVisibility.country && <TableCell>{user.country}</TableCell>}
                  {columnVisibility.phone && <TableCell>{user.phone}</TableCell>}
                  {columnVisibility.type && <TableCell className="capitalize">{user.type}</TableCell>}
                  {columnVisibility.tier && <TableCell>
                    <Select value={user.tier} onValueChange={(value) => attemptTierChange(user, value as Tier)} disabled={!isAdmin}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableTiers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  </TableCell>}
                  {columnVisibility.status && <TableCell>
                    <Badge variant={statusVariant(user.status)} className="capitalize">
                      {user.status}
                    </Badge>
                  </TableCell>}
                  {isAdmin && columnVisibility.approvedBy && <TableCell>
                    {user.approvedBy ? (
                        <div>
                            <p className="font-medium">{userNameMap[user.approvedBy] || user.approvedBy}</p>
                            {user.approvedAt && <p className="text-xs text-muted-foreground">{new Date(user.approvedAt).toLocaleDateString()}</p>}
                        </div>
                    ) : 'N/A'}
                  </TableCell>}
                  {columnVisibility.last_seen && <TableCell>
                    {user.last_seen ? new Date(user.last_seen).toLocaleString() : 'Never'}
                  </TableCell>}
                  {columnVisibility.role && isAdmin && <TableCell>
                     <Badge variant="outline">{user.role}</Badge>
                  </TableCell>}
                  {columnVisibility.created_at && <TableCell>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </TableCell>}
                  {isAdmin && columnVisibility.remarks && <TableCell>
                      <p className="w-32 truncate">{user.remarks}</p>
                    </TableCell>}
                  {columnVisibility.actions && <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-[18px] w-[18px]" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {isAdmin && (
                            <DropdownMenuItem onClick={() => router.push(`/app/admin/users/edit/${user.uid}`)}>
                                Edit
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => router.push(`/app/admin/users/${user.uid}`)}>
                          View Profile
                        </DropdownMenuItem>
                        {isAdmin && (
                            <DropdownMenuItem onClick={() => window.open(`/app?impersonate=${user.uid}`, '_blank')}>
                                View as User
                            </DropdownMenuItem>
                        )}
                        {isAdmin && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => handleStatusChange(user, 'active')}>Activate</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusChange(user, 'inactive')}>Deactivate</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusChange(user, 'pending')}>Mark as Pending</DropdownMenuItem>
                                </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuItem onClick={() => handleResetPassword(user.email)}>
                                Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    setUserForPasswordSet(user);
                                    setIsSetPasswordDialogOpen(true);
                                }}>
                                Set Password
                                </DropdownMenuItem>
                                {user.status !== 'active' && (
                                    <DropdownMenuItem onClick={() => handleResendActivation(user)}>
                                        Resend Activation
                                    </DropdownMenuItem>
                                )}
                                {canDelete && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={() => openDeleteDialog([user])}
                                    >
                                    Delete User
                                    </DropdownMenuItem>
                                </>
                                )}
                            </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={Object.values(columnVisibility).filter(Boolean).length + 1} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
       <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {paginatedUsers.length} of {sortedUsers.length} user(s) displayed.
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
                        {[10, 20, 30, 40, 50, 100].map((pageSize) => (
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

      <Dialog open={isCompanyDrawerOpen} onOpenChange={setIsCompanyDrawerOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4 mb-4 text-left">
            <DialogTitle className="text-2xl font-bold text-primary">{selectedCompany?.name}</DialogTitle>
            <DialogDescription>
              Company profile and contact details.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCompany && (
            <div className="space-y-6 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <DetailRow label="Phone" value={selectedCompany.phone} />
                <DetailRow label="Website" value={selectedCompany.website_url} isLink />
                <DetailRow label="Country" value={selectedCompany.country} />
                <DetailRow label="City" value={selectedCompany.city} />
                <DetailRow label="VAT Number" value={selectedCompany.vat_no} />
                <DetailRow label="Registration No." value={selectedCompany.company_reg} />
                <DetailRow label="TRA License" value={selectedCompany.tra_license} />
                <DetailRow label="DMC" value={selectedCompany.dmc} />
                <div className="sm:col-span-2">
                    <DetailRow label="Street Address" value={selectedCompany.street_address} />
                </div>
              </div>
              
              <div className="pt-6 border-t flex justify-end gap-3">
                <Button 
                    variant="outline"
                    onClick={() => setIsCompanyDrawerOpen(false)}
                >
                    Close
                </Button>
                <Button 
                    variant="default"
                    onClick={() => {
                        setIsCompanyDrawerOpen(false);
                        router.push(`/app/admin/companies/edit/${selectedCompany.id}`);
                    }}
                >
                    Edit Company
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value, isLink }: { label: string, value?: string | null, isLink?: boolean }) {
    if (!value) return null;
    return (
        <div className="flex flex-col space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
            {isLink ? (
                <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium break-all">
                    {value}
                </a>
            ) : (
                <span className="text-sm font-medium text-foreground">{value}</span>
            )}
        </div>
    );
}

    

    

    



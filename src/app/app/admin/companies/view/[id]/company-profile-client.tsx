

"use client";

import { notFound, useRouter } from 'next/navigation';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileText, Download, Building, Users, Trash2, PlusCircle, UserPlus, Search, X } from 'lucide-react';
import Link from 'next/link';
import type { SignedContract, Company, User } from '@/lib/types';
import { useAuth } from '@/app/app/app-provider';
import { getUsers, getUsersByCompanyId, updateUser } from '@/services/user-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
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
import { buttonVariants } from '@/components/ui/button';
import { formatWebsiteDisplay, ensureHttps } from '@/lib/utils';

export function CompanyProfileClient({ company }: { company: Company }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user: viewingUser } = useAuth();
  const [linkedUsers, setLinkedUsers] = React.useState<User[]>([]);
  const [allUsers, setAllUsers] = React.useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = React.useState(false);
  const [userToRemove, setUserToRemove] = React.useState<User | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  const fetchUsers = React.useCallback(async () => {
    setIsLoadingUsers(true);
    const [companyUsers, allSystemUsers] = await Promise.all([
        getUsersByCompanyId(company.id),
        getUsers()
    ]);
    setLinkedUsers(companyUsers);
    setAllUsers(allSystemUsers);
    setIsLoadingUsers(false);
  }, [company.id]);
  
  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const unassignedUsers = React.useMemo(() => {
    const linkedIds = new Set(linkedUsers.map(u => u.uid));
    const filtered = allUsers.filter(u => !linkedIds.has(u.uid));
    if (!searchTerm) {
        return filtered;
    }
    return filtered.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allUsers, linkedUsers, searchTerm]);
  
  const handleAddUser = async (userToAdd: User) => {
      try {
          await updateUser(userToAdd.uid, { companyId: company.id, company: company.name });
          toast({ title: 'User Added', description: `${userToAdd.name} has been added to ${company.name}.` });
          fetchUsers(); // Refresh both lists
      } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not add user to the company.' });
      }
  };

  const handleRemoveUser = async () => {
      if (!userToRemove) return;
      try {
          await updateUser(userToRemove.uid, { companyId: null, company: null });
          toast({ title: 'User Removed', description: `${userToRemove.name} has been removed from ${company.name}.` });
          fetchUsers(); // Refresh both lists
      } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not remove user from the company.' });
      } finally {
          setUserToRemove(null);
      }
  };


  if (!company) {
    return notFound();
  }

  const canEdit = viewingUser?.role === 'Admin' || viewingUser?.role === 'Super Admin';
  
  const getInitials = (name: string) => {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[1]) {
      return `${names[0][0]}${names[1][0]}`;
    }
    return name.substring(0, 2);
  };

  const DetailItem = ({ label, value, children }: { label: string, value?: string | React.ReactNode, children?: React.ReactNode }) => (
    <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {value && <p className="text-base font-semibold">{value}</p>}
        {children}
    </div>
  );

  const DocumentLink = ({ doc, label }: { doc?: SignedContract, label: string }) => (
    <DetailItem label={label}>
        {doc?.url ? (
            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                <FileText className="h-4 w-4" />
                <span>{doc.name}</span>
            </a>
        ) : <p className="text-base font-semibold">N/A</p>}
    </DetailItem>
  );

  return (
    <div className="flex flex-col gap-8">
       <AlertDialog open={!!userToRemove} onOpenChange={(isOpen) => !isOpen && setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {userToRemove?.name} from {company.name}. They will no longer be associated with this company.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveUser} className={buttonVariants({ variant: "destructive" })}>
               Yes, remove user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add User to {company.name}</DialogTitle>
            <DialogDescription>
              Select a user to add them to this company. This will overwrite their current company assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by name or email..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2 border rounded-md p-2">
                {unassignedUsers.map(user => (
                    <div key={user.uid} className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                             <Avatar className="h-9 w-9">
                                <AvatarImage src={`/avatars/0${(parseInt(user.uid) % 5) + 1}.png`} alt={user.name} />
                                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                        <Button size="sm" onClick={() => handleAddUser(user)}>
                            <UserPlus className="mr-2 h-4 w-4"/>
                            Add User
                        </Button>
                    </div>
                ))}
                {unassignedUsers.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">No more users to add.</p>
                )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       <div className="flex items-center justify-between">
        <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Company Profile</h1>
            <p className="text-muted-foreground">
                Details for {company.name}.
            </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-[18px] w-[18px]" />
                Back
            </Button>
            {canEdit && (
              <Link href={`/app/admin/companies/edit/${company.id}`}>
                <Button>
                    <Edit className="mr-2 h-[18px] w-[18px]" />
                    Edit Company
                </Button>
              </Link>
            )}
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle className="text-2xl">{company.name}</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-4">Contact & Location</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <DetailItem label="Company Phone" value={company.phone} />
                        <DetailItem label="Website" value={company.website_url ? <a href={ensureHttps(company.website_url)} target="_blank" rel="noreferrer" className="text-primary hover:underline">{formatWebsiteDisplay(company.website_url)}</a> : "N/A"} />
                        <DetailItem label="Street Address" value={company.street_address} />
                        <DetailItem label="Postal Address" value={company.postal_address} />
                        <DetailItem label="City" value={company.city} />
                        <DetailItem label="Zip/Postal Code" value={company.zip_code} />
                        <DetailItem label="Country" value={company.country} />
                    </div>
                </div>
                <Separator />
                <div>
                     <h3 className="text-lg font-semibold mb-4">Legal & Financial</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <DetailItem label="Company Reg. No." value={company.company_reg} />
                        <DocumentLink doc={company.company_reg_doc} label="Company Reg. Document" />
                        <DetailItem label="TRA License No." value={company.tra_license} />
                        <DocumentLink doc={company.tra_license_doc} label="TRA License Document" />
                        {company.vat_no && <DetailItem label="VAT No." value={company.vat_no} />}
                    </div>
                </div>
                <Separator />
                <div>
                    <h3 className="text-lg font-semibold mb-4">Signed Contracts</h3>
                    {company.signed_contracts && company.signed_contracts.length > 0 ? (
                        <ul className="space-y-3">
                            {company.signed_contracts.map((contract, index) => (
                                <li key={index} className="flex items-center justify-between rounded-md border p-3">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{contract.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Uploaded: {new Date(contract.uploaded_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <a href={contract.url} target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" size="sm">
                                            <FileText className="mr-2 h-4 w-4" />
                                            View
                                        </Button>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground">No signed contracts uploaded for this company.</p>
                    )}
                </div>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-primary" />
                    <CardTitle>Company Members ({linkedUsers.length})</CardTitle>
                </div>
                 <Button onClick={() => setIsAddUserDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Add User
                </Button>
            </div>
            <CardDescription>
                All users assigned to this company.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {isLoadingUsers ? (
                <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : linkedUsers.length > 0 ? (
                <div className="space-y-2">
                    {linkedUsers.map(user => (
                        <div key={user.uid} className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors">
                            <Link href={`/app/admin/users/${user.uid}`} className="flex-1">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={`/avatars/0${(parseInt(user.uid) % 5) + 1}.png`} alt={user.name} />
                                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{user.name}</p>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>
                            </Link>
                             <Button variant="destructive" size="sm" onClick={() => setUserToRemove(user)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-muted-foreground py-4 text-center">No users are currently assigned to this company.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

    
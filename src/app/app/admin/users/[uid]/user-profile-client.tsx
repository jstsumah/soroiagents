

"use client";

import { notFound, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Building, FileText, Download, Eye } from 'lucide-react';
import Link from 'next/link';
import type { User, Company, SignedContract } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { TierBadge } from '@/components/ui/tier-badge';
import { getUsersByCompanyId } from '@/services/user-service';
import { getCompany } from '@/services/company-service';
import { useAuth } from '@/app/app/app-provider';
import { AdminSetPasswordDialog } from '@/components/auth/admin-set-password-dialog';

export function UserProfileClient({ user, viewingUser }: { user: User, viewingUser: User | null }) {
  const router = useRouter();
  const [companyDetails, setCompanyDetails] = useState<Company | null>(null);
  const [colleagues, setColleagues] = useState<User[]>([]);
  const [memberSince, setMemberSince] = useState('');
  const [lastSeen, setLastSeen] = useState('');
  const { user: authUser } = useAuth();

  useEffect(() => {
    if (user.companyId) {
      getCompany(user.companyId).then(setCompanyDetails);
      getUsersByCompanyId(user.companyId).then(companyUsers => {
        setColleagues(companyUsers.filter(c => c.uid !== user.uid));
      });
    }
    
    if (user?.created_at) {
        setMemberSince(new Date(user.created_at).toLocaleDateString());
    }
    if (user?.last_seen) {
        setLastSeen(new Date(user.last_seen).toLocaleString());
    }
  }, [user]);

  if (!user) {
    return notFound();
  }
  
  const getInitials = (name: string) => {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[1]) {
      return `${names[0][0]}${names[1][0]}`;
    }
    return name.substring(0, 2);
  };
  
  const canEdit = authUser?.role === 'Admin' || authUser?.role === 'Super Admin';

  const handleViewAsUser = () => {
    window.open(`/app?impersonate=${user.uid}`, '_blank');
  };

  const DetailItem = ({ label, value, children }: { label: string, value?: string | React.ReactNode, children?: React.ReactNode }) => (
    <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {value ? <div className="text-base font-semibold">{value}</div> : null}
        {children}
    </div>
  );

  const DocumentLink = ({ doc, label }: { doc?: SignedContract, label: string }) => (
    <DetailItem label={label}>
        {doc?.url ? (
            <a href={doc.url} download={doc.name} className="flex items-center gap-2 text-primary hover:underline">
                <Download className="h-4 w-4" />
                <span>{doc.name}</span>
            </a>
        ) : <p className="text-base font-semibold">Not Uploaded</p>}
    </DetailItem>
  );

  return (
    <div className="flex flex-col gap-8">
       <div className="flex items-center justify-between">
        <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>
            <p className="text-muted-foreground">
            Details for {user.name}.
            </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-[18px] w-[18px]" />
                Back
            </Button>
            {canEdit && (
              <>
                <Button variant="outline" onClick={handleViewAsUser}>
                    <Eye className="mr-2 h-[18px] w-[18px]" />
                    View as User
                </Button>
                <AdminSetPasswordDialog user={user} />
                <Link href={`/app/admin/users/edit/${user.uid}`}>
                  <Button>
                      <Edit className="mr-2 h-[18px] w-[18px]" />
                      Edit User
                  </Button>
                </Link>
              </>
            )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-3">
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-20 w-20 border">
                    <AvatarImage src={`/avatars/0${(parseInt(user.uid) % 5) + 1}.png`} alt={`@${user.name}`} />
                    <AvatarFallback className="text-3xl">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-2xl">{user.name}</CardTitle>
                    <CardDescription className="text-base">{user.email}</CardDescription>
                </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Personal Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <DetailItem label="Full Name" value={user.name} />
                                <DetailItem label="Email" value={user.email} />
                                <DetailItem label="Direct Phone" value={user.phone} />
                                <DetailItem label="Country" value={user.country} />
                                <DetailItem label="Status">
                                    <Badge variant={user.status === "active" ? "default" : "destructive"}>{user.status}</Badge>
                                </DetailItem>
                                <DetailItem label="Member Since" value={memberSince} />
                                <DetailItem label="Last Seen" value={lastSeen || 'Never'} />
                            </div>
                        </div>
                        <Separator />
                        <div>
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Company Information</h3>
                                {user.companyId && canEdit ? (
                                    <Button variant="outline" asChild>
                                        <Link href={`/app/admin/companies/edit/${user.companyId}`}>
                                            <Building className="mr-2 h-4 w-4" />
                                            Update Company Info
                                        </Link>
                                    </Button>
                                ) : user.companyId ? (
                                    <Button variant="outline" asChild>
                                        <Link href={`/app/admin/companies/view/${user.companyId}`}>
                                            <Building className="mr-2 h-4 w-4" />
                                            View Company Profile
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button variant="secondary" disabled>No Linked Company</Button>
                                )}
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <DetailItem label="Company Name" value={companyDetails?.name} />
                                <DetailItem label="Company Phone" value={companyDetails?.phone} />
                                <DetailItem label="Website" value={companyDetails?.website_url ? <a href={companyDetails.website_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{companyDetails.website_url}</a> : "N/A"} />
                                <DetailItem label="Street Address" value={companyDetails?.street_address} />
                                <DetailItem label="City" value={companyDetails?.city} />
                                <DetailItem label="Postal Address" value={companyDetails?.postal_address} />
                                <DetailItem label="Zip/Postal Code" value={companyDetails?.zip_code} />
                                <DetailItem label="Company Country" value={companyDetails?.country} />
                                <DetailItem label="Company Reg. No." value={companyDetails?.company_reg} />
                                <DocumentLink doc={companyDetails?.company_reg_doc} label="Company Reg. Document" />
                                <DetailItem label="TRA License No." value={companyDetails?.tra_license} />
                                <DocumentLink doc={companyDetails?.tra_license_doc} label="TRA License Document" />
                                {companyDetails?.vat_no && <DetailItem label="VAT No." value={companyDetails.vat_no} />}
                                <DetailItem label="Agent Type">
                                    <Badge variant="outline" className="capitalize">{user.type}</Badge>
                                </DetailItem>
                                 <DetailItem label="Access Tier">
                                    <TierBadge tier={user.tier} />
                                </DetailItem>
                                {user.type === 'international' && <DetailItem label="DMC" value={user.dmc} />}
                            </div>
                        </div>
                         {colleagues.length > 0 && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Company Colleagues</h3>
                                    <Card className="bg-muted/50">
                                        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {colleagues.map(colleague => (
                                                <Link key={colleague.uid} href={`/app/admin/users/${colleague.uid}`}>
                                                    <div className="flex items-center gap-2 p-2 rounded-md hover:bg-background transition-colors">
                                                        <Avatar className="h-8 w-8 text-xs">
                                                            <AvatarImage src={`/avatars/0${(parseInt(colleague.uid) % 5) + 1}.png`} alt={`@${colleague.name}`} />
                                                            <AvatarFallback>{getInitials(colleague.name)}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium text-sm text-primary hover:underline">{colleague.email}</span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </div>
                            </>
                         )}
                        {companyDetails?.signed_contracts && companyDetails.signed_contracts.length > 0 && (
                                <>
                                 <Separator />
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Signed Contracts</h3>
                                    <ul className="space-y-3">
                                        {companyDetails.signed_contracts.map((contract, index) => (
                                            <li key={index} className="flex items-center justify-between rounded-md border p-3">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <p className="font-medium">{contract.name}</p>
                                                    </div>
                                                </div>
                                                <a href={contract.url} download>
                                                    <Button variant="ghost" size="sm">
                                                        <Download className="mr-2 h-4 w-4" />
                                                        Download
                                                    </Button>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                </>
                            )}
                        
                        {canEdit && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Admin Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <DetailItem label="User Role" value={<Badge variant="secondary">{user.role}</Badge>} />
                                        <DetailItem label="Payment Terms" value={user.payment_terms} />
                                    </div>
                                    {user.remarks && (
                                        <div className="mt-6">
                                            <DetailItem label="Remarks">
                                                <p className="text-base font-normal whitespace-pre-wrap bg-muted/50 p-3 rounded-md">{user.remarks}</p>
                                            </DetailItem>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}


export const UserProfileSkeleton = () => (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <div>
                <Skeleton className="h-9 w-72 mb-2" />
                <Skeleton className="h-5 w-48" />
            </div>
            <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-28" />
            </div>
        </div>
        <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div>
                    <Skeleton className="h-7 w-48 mb-2" />
                    <Skeleton className="h-5 w-64" />
                </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                    <Skeleton className="h-6 w-40" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       {Array.from({ length: 4 }).map((_, i) => <div key={i}><Skeleton className="h-5 w-24 mb-2" /><Skeleton className="h-6 w-full" /></div>)}
                    </div>
                </div>
                <Separator />
                 <div className="space-y-4">
                    <Skeleton className="h-6 w-48" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       {Array.from({ length: 14 }).map((_, i) => <div key={i}><Skeleton className="h-5 w-24 mb-2" /><Skeleton className="h-6 w-full" /></div>)}
                    </div>
                </div>
                <Separator />
            </CardContent>
        </Card>
    </div>
);

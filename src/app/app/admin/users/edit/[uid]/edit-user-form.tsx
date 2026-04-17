
"use client";

import { useForm, useWatch, useFieldArray, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import * as React from "react";
import { Loader2, Upload, FileText, Download, Trash2, PlusCircle, Building, Check, ChevronsUpDown } from "lucide-react";
import { TIERS } from "@/lib/constants";
import type { User, Tier, Status, UserType, SignedContract, Role, Company } from "@/lib/types";
import { uploadFile } from "@/services/storage-service";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/app/app/app-provider";
import { countries } from "@/lib/countries";
import { getCompanies, getCompany } from "@/services/company-service";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

const paymentTerms = [
    "20/80 - 45 days",
    "10/90 - 30 days",
    "100% - 30 days Prior",
    "Full Prepayment on Confirmation",
    "30 days after travel"
];

const ROLES: Role[] = ['Agent', 'Admin', 'Super Admin'];

interface EditUserFormProps {
  user?: User;
  children: React.ReactNode;
  onSubmit: (values: any) => void;
}

const EditUserFormComponent = ({ user, children, onSubmit }: EditUserFormProps) => {
  const { toast } = useToast();
  const { user: viewingUser } = useAuth();
  const isEditMode = !!user;
  const isAdmin = viewingUser?.role === 'Admin' || viewingUser?.role === 'Super Admin';
  const isSuperAdmin = viewingUser?.role === 'Super Admin';
  const isAgentEditingOwnProfile = viewingUser?.uid === user?.uid && viewingUser?.role === 'Agent';

  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [isCompaniesLoading, setIsCompaniesLoading] = React.useState(true);
  const [isCompanyPopoverOpen, setIsCompanyPopoverOpen] = React.useState(false);
  const [companyDetails, setCompanyDetails] = React.useState<Company | null>(null);


  const form = useFormContext();
  const companyId = useWatch({ control: form.control, name: "companyId"});
  
  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\b(\w)/g, s => s.toUpperCase());
  };
  
  const availableTiers = React.useMemo(() => {
    if (isSuperAdmin) {
      return TIERS;
    }
    return TIERS.filter(t => t !== 'Platinum');
  }, [isSuperAdmin]);


  React.useEffect(() => {
    async function fetchCompanies() {
        setIsCompaniesLoading(true);
        const fetchedCompanies = await getCompanies();
        setCompanies(fetchedCompanies);
        setIsCompaniesLoading(false);
    }
    if (isAdmin) {
      fetchCompanies();
    } else {
        setIsCompaniesLoading(false);
    }
  }, [isAdmin]);

   React.useEffect(() => {
    if (companyId) {
      getCompany(companyId).then(setCompanyDetails);
    } else {
      setCompanyDetails(null);
    }
  }, [companyId]);

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
    <Form {...form}>
      <form onSubmit={onSubmit}>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Personal Details</CardTitle>
                    <CardDescription>Your personal contact information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }: any) => (
                                <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl><Input placeholder="e.g., John Doe" {...field} onChange={(e) => field.onChange(toTitleCase(e.target.value))} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }: any) => (
                                <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl><Input 
                                    type="email" 
                                    placeholder="e.g., john.doe@example.com" 
                                    {...field} 
                                    onChange={(e) => field.onChange(e.target.value.replace(/\s/g, '').toLowerCase())}
                                    disabled={isEditMode} 
                                /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }: any) => (
                                <FormItem>
                                <FormLabel>Direct Phone (Optional)</FormLabel>
                                <FormControl><Input 
                                    placeholder="+1 555 1234" 
                                    {...field} 
                                    onChange={(e) => field.onChange(e.target.value.replace(/\s/g, '').replace(/\./g, ''))}
                                /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField control={form.control} name="country" render={({ field }: any) => (<FormItem><FormLabel>Country</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger></FormControl><SelectContent>{countries.map(country => (<SelectItem key={country} value={country}>{country}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        {!isEditMode && (
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }: any) => (
                                    <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl><PasswordInput placeholder="••••••••" {...field} /></FormControl>
                                    <FormDescription>A temporary password for the new user.</FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                         {isEditMode && (
                             <>
                                <DetailItem label="Member Since" value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'} />
                                <DetailItem label="Last Seen" value={user?.last_seen ? new Date(user.last_seen).toLocaleString() : 'Never'} />
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Company Information</CardTitle>
                            <CardDescription>
                                {isAdmin ? "Assign this user to a company from the directory." : "Your assigned company details."}
                            </CardDescription>
                        </div>
                         {isAdmin && (
                            <Button variant="outline" asChild>
                                <Link href="/app/admin/companies/add">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add New Company
                                </Link>
                            </Button>
                        )}
                         {isAgentEditingOwnProfile && (
                            <Button variant="outline" asChild>
                                <Link href={companyId ? `/app/agent/company/edit` : `/app/agent/company/edit`}>
                                    <Building className="mr-2 h-4 w-4" />
                                    {companyId ? 'Update Company Info' : 'Add Company Info'}
                                </Link>
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isAdmin ? (
                        <FormField
                            control={form.control}
                            name="companyId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Company</FormLabel>
                                <Popover open={isCompanyPopoverOpen} onOpenChange={setIsCompanyPopoverOpen}>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                                "w-[300px] justify-between",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            disabled={isCompaniesLoading}
                                        >
                                        {isCompaniesLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {field.value
                                            ? companies.find(c => c.id === field.value)?.name || form.getValues('company')
                                            : "Select company"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search company..." />
                                        <CommandEmpty>No company found.</CommandEmpty>
                                        <CommandGroup>
                                        {companies.map((company) => (
                                            <CommandItem
                                                value={company.name}
                                                key={company.id}
                                                onSelect={() => {
                                                    form.setValue("companyId", company.id);
                                                    form.setValue("company", company.name);
                                                    setIsCompanyPopoverOpen(false);
                                                }}
                                                >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        company.id === field.value ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {company.name}
                                                </CommandItem>
                                        ))}
                                        </CommandGroup>
                                    </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    Assigning a company will link the user to that company&apos;s central profile.
                                </FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                    ) : companyDetails ? (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-lg font-semibold mb-4">Contact & Location</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <DetailItem label="Company Name" value={companyDetails?.name} />
                                    <DetailItem label="Company Phone" value={companyDetails?.phone} />
                                    <DetailItem label="Website" value={companyDetails?.website_url ? <a href={companyDetails.website_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{companyDetails.website_url}</a> : "N/A"} />
                                    <DetailItem label="Street Address" value={companyDetails?.street_address} />
                                    <DetailItem label="Postal Address" value={companyDetails?.postal_address} />
                                    <DetailItem label="City" value={companyDetails?.city} />
                                    <DetailItem label="Zip/Postal Code" value={companyDetails?.zip_code} />
                                    <DetailItem label="Country" value={companyDetails?.country} />
                                </div>
                            </div>
                             <Separator />
                            <div>
                                <h4 className="text-lg font-semibold mb-4">Legal & Financial</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <DetailItem label="Company Reg. No." value={companyDetails?.company_reg} />
                                    <DocumentLink doc={companyDetails?.company_reg_doc} label="Company Reg. Document" />
                                    <DetailItem label="TRA License No." value={companyDetails?.tra_license} />
                                    <DocumentLink doc={companyDetails?.tra_license_doc} label="TRA License Document" />
                                    {companyDetails.vat_no && <DetailItem label="VAT No." value={companyDetails.vat_no} />}
                                </div>
                            </div>
                            {companyDetails.signed_contracts && companyDetails.signed_contracts.length > 0 && (
                                <>
                                 <Separator />
                                <div>
                                    <h4 className="text-lg font-semibold mb-4">Signed Contracts</h4>
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
                        </div>
                    ) : (
                         <p className="text-sm text-muted-foreground">You are not currently assigned to a company.</p>
                    )}
                </CardContent>
            </Card>
            
            {(viewingUser?.role === 'Admin' || viewingUser?.role === 'Super Admin') &&
                <Card>
                    <CardHeader>
                        <CardTitle>Account Settings</CardTitle>
                        <CardDescription>Manage agent&apos;s access and status in the portal.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <FormField control={form.control} name="type" render={({ field }: any) => (
                                <FormItem>
                                    <FormLabel>Agent Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="local">Local</SelectItem>
                                            <SelectItem value="international">International</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="tier" render={({ field }: any) => (
                                <FormItem>
                                    <FormLabel>Access Tier</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select tier" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {availableTiers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="status" render={({ field }: any) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            {viewingUser?.role === 'Super Admin' ? (
                                <FormField control={form.control} name="role" render={({ field }: any) => (
                                    <FormItem>
                                        <FormLabel>User Role</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            ) : (
                                <div>
                                    <FormLabel>User Role</FormLabel>
                                    <Input disabled value={form.getValues('role')} />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            }

            {(viewingUser?.role === 'Admin' || viewingUser?.role === 'Super Admin') && (
                <Card>
                    <CardHeader>
                        <CardTitle>Admin Settings</CardTitle>
                        <CardDescription>These settings are only visible to administrators.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="dmc" render={({ field }: any) => (
                                <FormItem>
                                <FormLabel>DMC</FormLabel>
                                <FormControl><Input placeholder="DMC Name" {...field} /></FormControl>
                                <FormDescription>Required for International agents.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="payment_terms" render={({ field }: any) => (
                                <FormItem>
                                    <FormLabel>Payment Terms</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select payment terms" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {paymentTerms.map(term => <SelectItem key={term} value={term}>{term}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField
                                control={form.control}
                                name="canViewUsers"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            Can View Users
                                        </FormLabel>
                                        <FormDescription>
                                            Allows this user to see the list of all users with read-only access.
                                        </FormDescription>
                                    </div>
                                    </FormItem>
                                )}
                            />
                            {isSuperAdmin && (
                                <FormField
                                    control={form.control}
                                    name="hasAllTierAccess"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Has All Tier Access
                                            </FormLabel>
                                            <FormDescription>
                                            Allows user to access all resources regardless of their tier.
                                            </FormDescription>
                                        </div>
                                        </FormItem>
                                    )}
                                />
                            )}
                            <FormField
                                control={form.control}
                                name="remarks"
                                render={({ field }: any) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>Remarks (Admin Only)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Add private notes about this user..."
                                                {...field}
                                                value={field.value ?? ''}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                                />
                        </div>
                    </CardContent>
                </Card>
            )}
            {children}
        </div>
      </form>
    </Form>
  );
}

export const EditUserForm = React.memo(EditUserFormComponent);

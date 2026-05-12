
"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import * as React from "react";
import { FileText, Download, Trash2, Loader2 } from "lucide-react";
import type { Company, SignedContract, User } from "@/lib/types";
import { uploadFile } from "@/lib/upload-utils";
import { addCompany, updateCompany } from "@/services/company-service";
import { countries } from "@/lib/countries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/app/app/app-provider";
import { updateUser } from "@/services/user-service";
import { formatWebsiteDisplay, ensureHttps } from "@/lib/utils";
import { Control } from "react-hook-form";

const signedContractSchema = z.object({
    name: z.string(),
    url: z.string(),
    // z.coerce.date() handles both Date objects and ISO date strings from the DB
    uploaded_at: z.coerce.date(),
});

const phoneRegex = new RegExp(
  /^\+[1-9]\d{1,14}$/
);

const websiteRegex = new RegExp(
  /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
);

const getCompanyFormSchema = (isAdmin: boolean) => {
  const base = z.object({
    name: z.string().min(3, "Company name is required (min 3 characters)."),
    phone: z.string().optional().or(z.literal('')),
    website_url: z.string().regex(websiteRegex, 'Please enter a valid URL (e.g., yourdomain.com).').optional().or(z.literal('')),
    street_address: z.string().min(1, "Street address is required."),
    city: z.string().min(1, "City is required."),
    country: z.string().min(1, "Country is required."),
    postal_address: z.string().optional(),
    zip_code: z.string().optional(),
    vat_no: z.string().optional(),
    company_reg: z.string().min(1, "Company registration number is required."),
    tra_license: z.string().optional(),
    new_contract_file: z.any().optional(),
    company_reg_doc_file: z.any().optional(),
    tra_license_doc_file: z.any().optional(),
    signed_contracts: z.array(signedContractSchema).optional(),
    company_reg_doc: z.any().optional().nullable(),
    tra_license_doc: signedContractSchema.optional().nullable(),
  });

  if (isAdmin) {
    return base.partial().extend({
      name: z.string().min(3, "Company name is required (min 3 characters).").optional().or(z.literal('')),
    });
  }

  return base;
};

// ── Stable sub-component defined OUTSIDE the parent so its identity never
// changes between renders. Defining it inside a render function causes React
// to unmount/remount it every render, clearing filled inputs.
interface DocumentUploadFieldProps {
  doc: SignedContract | undefined | null;
  onFileChange: (file: File) => void;
  onRemove: () => void;
  label: string;
  formName: "company_reg_doc_file" | "tra_license_doc_file";
  control: Control<z.infer<typeof formSchema>>;
}

function DocumentUploadField({
  doc,
  onFileChange,
  onRemove,
  label,
  formName,
  control,
}: DocumentUploadFieldProps) {
  return (
    <div>
      {doc ? (
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                {doc.name}
              </a>
              <p className="text-sm text-muted-foreground">
                Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button type="button" variant="destructive" size="sm" onClick={onRemove}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        </div>
      ) : (
        <FormField
          control={control}
          name={formName}
          render={({ field: { onChange, ...fieldProps } }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                {label}
                {formName === "company_reg_doc_file" && (
                  <span className="text-destructive">*</span>
                )}
              </FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e: any) =>
                    e.target.files?.[0] && onFileChange(e.target.files[0])
                  }
                  {...fieldProps}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}

interface CompanyFormProps {
  company?: Company;
  onSubmit?: (values: z.infer<typeof formSchema>) => Promise<void>;
}

export function CompanyForm({ company, onSubmit }: CompanyFormProps) {
  const { toast } = useToast();
  const isEditMode = !!company;
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';
  const schema = React.useMemo(() => getCompanyFormSchema(isAdmin), [isAdmin]);
  const [isSaving, setIsSaving] = React.useState(false);


  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: company?.name || "",
      phone: company?.phone || "",
      website_url: company?.website_url || "",
      street_address: company?.street_address || "",
      city: company?.city || "",
      country: company?.country || "",
      postal_address: company?.postal_address || "",
      zip_code: company?.zip_code || "",
      vat_no: company?.vat_no || "",
      company_reg: company?.company_reg || "",
      tra_license: company?.tra_license || "",
      signed_contracts: company?.signed_contracts || [],
      company_reg_doc: company?.company_reg_doc || null,
      tra_license_doc: company?.tra_license_doc || null,
    },
  });

  const { fields, remove, append } = useFieldArray({
    control: form.control,
    name: "signed_contracts",
  });

  const companyRegDoc = useWatch({ control: form.control, name: "company_reg_doc" });
  const traLicenseDoc = useWatch({ control: form.control, name: "tra_license_doc" });
  
  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\b(\w)/g, s => s.toUpperCase());
  };

  const formatUrl = (url: string): string => {
    if (!url) return '';
    let formatted = url.trim().toLowerCase();
    // Remove protocol and www.
    formatted = formatted.replace(/^https?:\/\//, '').replace(/^www\./, '');
    // Remove trailing slash
    if (formatted.endsWith('/')) {
        formatted = formatted.slice(0, -1);
    }
    return `https://${formatted}`;
  };

  const handleUrlBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const formatted = ensureHttps(e.target.value);
    if (e.target.value !== formatted) {
      form.setValue('website_url', formatted, { shouldValidate: true });
    }
  };

  // Removed fileToBase64 as we now use FormData for uploads to avoid nesting/size errors.

  const handleFileUpload = React.useCallback(async (file: File, docType: 'company_reg_doc' | 'tra_license_doc' | 'contract') => {
    const companyName = form.getValues('name');
    if (!companyName) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide a company name before uploading documents.' });
      return;
    }

    if (docType === 'contract' && (form.getValues('signed_contracts') || []).some((c: any) => c.name === file.name)) {
        toast({ variant: 'destructive', title: 'Duplicate File', description: 'A contract with this filename already exists.' });
        return;
    }

    const filePath = `companies/${companyName}/documents/${file.name}`;
    
    try {
      const url = await uploadFile(file, filePath);
      
      const newDoc: SignedContract = {
        name: file.name,
        url: url,
        uploaded_at: new Date(),
      };
      
      const fieldUpdates = {
        'company_reg_doc': () => {
          form.setValue('company_reg_doc', newDoc, { shouldValidate: true });
          form.setValue('company_reg_doc_file', undefined);
        },
        'tra_license_doc': () => {
          form.setValue('tra_license_doc', newDoc, { shouldValidate: true });
          form.setValue('tra_license_doc_file', undefined);
        },
        'contract': () => {
          append(newDoc);
          form.setValue('new_contract_file', undefined);
        },
      };

      fieldUpdates[docType]();

      toast({ title: "Document Uploaded", description: `${newDoc.name} is ready. Save changes to confirm.` });
    } catch (error: any) {
      console.error('File upload failed', error);
      toast({ 
        variant: 'destructive', 
        title: 'Upload Failed', 
        description: error.message || 'Could not upload the file.' 
      });
    }
  }, [form, toast, append]);

  const defaultOnSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSaving(true);
    try {
        const dataToSave = { ...values };
        delete (dataToSave as any).new_contract_file;
        delete (dataToSave as any).company_reg_doc_file;
        delete (dataToSave as any).tra_license_doc_file;

        if (isEditMode && company) {
            await updateCompany(company.id, dataToSave);
            toast({ title: "Company Updated", description: "Company details have been saved." });
        } else {
            const newCompanyId = await addCompany(dataToSave);
            // If an agent is creating their own company, link them to it.
            if(user?.role === 'Agent') {
                await updateUser(user.uid, { companyId: newCompanyId, company: dataToSave.name });
            }
            toast({ title: "Company Created", description: "The new company has been added." });
        }
        router.back();
        router.refresh();
    } catch (error: any) {
        console.error("Failed to save company:", error);
        toast({ 
            variant: "destructive", 
            title: "Save Failed", 
            description: error.message || "An error occurred while saving the company." 
        });
    } finally {
        setIsSaving(false);
    }
  }

  const handleSubmit = onSubmit 
    ? (values: any) => {
        setIsSaving(true);
        onSubmit(values).finally(() => setIsSaving(false));
      } 
    : defaultOnSubmit;
  


  const onInvalidForm = (errors: any) => {
    console.error('[CompanyForm] Validation errors prevented submit:', errors);
    const firstError = Object.values(errors)[0] as any;
    toast({
      variant: 'destructive',
      title: 'Please fix the form errors',
      description: firstError?.message || 'Some required fields are missing or invalid.',
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit, onInvalidForm)} className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Company Details</CardTitle>
                <CardDescription>General information about the company.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField control={form.control} name="name" render={({ field }: any) => (<FormItem><FormLabel>Company Name <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., Safari Ventures" {...field} onChange={(e) => field.onChange(toTitleCase(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="phone" render={({ field }: any) => (<FormItem><FormLabel>Company Phone <span className="text-destructive">*</span></FormLabel><FormControl><Input 
                        placeholder="e.g., +254712345678" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.replace(/\s/g, '').replace(/\./g, ''))}
                        value={field.value ?? ''}
                    /></FormControl><FormMessage /></FormItem>)} />
                    <FormField 
                        control={form.control} 
                        name="website_url" 
                        render={({ field }: any) => (
                            <FormItem>
                                <FormLabel>Website URL</FormLabel>
                                <FormControl>
                                    <Input 
                                        placeholder="website.com" 
                                        {...field}
                                        onBlur={handleUrlBlur}
                                        value={formatWebsiteDisplay(field.value) ?? ''}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} 
                    />
                    <FormField control={form.control} name="street_address" render={({ field }: any) => (<FormItem><FormLabel>Street Address <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., 123 Safari Lane" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(toTitleCase(e.target.value))}/></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="postal_address" render={({ field }: any) => (<FormItem><FormLabel>Postal Address</FormLabel><FormControl><Input placeholder="e.g., P.O. Box 100" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="city" render={({ field }: any) => (<FormItem><FormLabel>City <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., Nairobi" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(toTitleCase(e.target.value))}/></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="zip_code" render={({ field }: any) => (<FormItem><FormLabel>Zip/Postal Code</FormLabel><FormControl><Input placeholder="e.g., 00100" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="country" render={({ field }: any) => (<FormItem><FormLabel>Country <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger></FormControl><SelectContent>{countries.map(country => (<SelectItem key={country} value={country}>{country}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="vat_no" render={({ field }: any) => (<FormItem><FormLabel>VAT No.</FormLabel><FormControl><Input placeholder="e.g., P012345678X" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Legal Documents</CardTitle>
                <CardDescription>Company registration and licensing information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-2">
                        <FormField control={form.control} name="company_reg" render={({ field }: any) => (<FormItem><FormLabel>Company Registration No. <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., C12345" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                        <DocumentUploadField
                            label="Company Registration Document"
                            formName="company_reg_doc_file"
                            doc={companyRegDoc}
                            onFileChange={(file) => handleFileUpload(file, 'company_reg_doc')}
                            onRemove={() => form.setValue('company_reg_doc', null)}
                            control={form.control}
                        />
                    </div>
                    <div className="space-y-2">
                        <FormField control={form.control} name="tra_license" render={({ field }: any) => (<FormItem><FormLabel>TRA License No. (Optional)</FormLabel><FormControl><Input placeholder="e.g., TRA/1/123" {...field} value={field.value ?? ''} /></FormControl><FormDescription>Required for Kenya Inbound Operators.</FormDescription><FormMessage /></FormItem>)} />
                        <DocumentUploadField
                            label="TRA License Document (Optional)"
                            formName="tra_license_doc_file"
                            doc={traLicenseDoc}
                            onFileChange={(file) => handleFileUpload(file, 'tra_license_doc')}
                            onRemove={() => form.setValue('tra_license_doc', null)}
                            control={form.control}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Signed Contracts</CardTitle>
                <CardDescription>Manage and upload signed agreements.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 {fields.length > 0 && (
                    <ul className="space-y-3">
                        {fields.map((contract, index) => (
                            <li key={contract.id} className="flex items-center justify-between rounded-md border p-3">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <a href={(contract as any).url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{(contract as any).name}</a>
                                        <p className="text-sm text-muted-foreground">Uploaded: {new Date((contract as any).uploaded_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}><Trash2 className="mr-2 h-4 w-4"/>Remove</Button>
                            </li>
                        ))}
                    </ul>
                )}
                 <div className="flex items-end gap-2 rounded-lg border border-dashed p-4">
                     <FormField
                        control={form.control}
                        name="new_contract_file"
                        render={({ field: { onChange, onBlur, name, ref } }) => (
                            <FormItem className="flex-grow">
                                <FormLabel>Upload New Contract</FormLabel>
                                <FormControl>
                                    <Input type="file" accept="image/*,.pdf" onChange={(e) => {
                                        if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'contract');
                                        onChange(null);
                                    }} onBlur={onBlur} name={name} ref={ref} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>
            </CardContent>
        </Card>
        
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                {isEditMode ? "Save Changes" : "Create Company"}
            </Button>
        </div>
      </form>
    </Form>
  );
}

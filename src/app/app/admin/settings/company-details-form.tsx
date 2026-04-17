
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2 } from "lucide-react";
import { getCompanyDetails, saveCompanyDetails } from "@/services/settings-service";
import * as React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const phoneRegex = new RegExp(
  /^\+[1-9]\d{1,14}$/
);

const formSchema = z.object({
  companyName: z.string().min(2, "Company name is required.").optional(),
  contactEmail: z.string().email("Invalid email address.").optional().or(z.literal('')),
  contactPhone: z.string().regex(phoneRegex, 'Phone number must be in international format (e.g., +254712345678).').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  reservationsEmail: z.string().email("Invalid email address.").optional().or(z.literal('')),
  reservationsPhone: z.string().regex(phoneRegex, 'Phone number must be in international format (e.g., +254712345678).').optional().or(z.literal('')),
  salesMarketingEmail: z.string().email("Invalid email address.").optional().or(z.literal('')),
  salesMarketingPhone: z.string().regex(phoneRegex, 'Phone number must be in international format (e.g., +254712345678).').optional().or(z.literal('')),
});

export function CompanyDetailsForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      city: "",
      country: "",
      reservationsEmail: "",
      reservationsPhone: "",
      salesMarketingEmail: "",
      salesMarketingPhone: "",
    },
  });

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\b(\w)/g, s => s.toUpperCase());
  };

  React.useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      const details = await getCompanyDetails();
      form.reset(details);
      setIsLoading(false);
    };
    fetchDetails();
  }, [form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      await saveCompanyDetails(values);
      toast({
        title: "Company Details Saved!",
        description: "Your company branding details have been updated.",
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save company details.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Separator />
         <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
         <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    )
  }

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             <div>
                <h4 className="text-base font-semibold text-foreground mb-2">Primary Details</h4>
                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Your Company Name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="contactEmail"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>General Email</FormLabel>
                                <FormControl>
                                    <Input 
                                        placeholder="support@yourcompany.com" 
                                        {...field} 
                                        onChange={(e) => field.onChange(e.target.value.replace(/\s/g, ''))}
                                        value={field.value ?? ''} 
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="contactPhone"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>General Phone</FormLabel>
                                <FormControl>
                                    <Input 
                                        placeholder="+254712345678" 
                                        {...field} 
                                        onChange={(e) => field.onChange(e.target.value.replace(/\s/g, '').replace(/\./g, ''))}
                                        value={field.value ?? ''} 
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                </div>
            </div>

            <Separator />
            
            <div>
                <h4 className="text-base font-semibold text-foreground mb-2">Address</h4>
                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                                <Input placeholder="123 Main St" {...field} onChange={(e) => field.onChange(toTitleCase(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                    <Input placeholder="New York" {...field} onChange={(e) => field.onChange(toTitleCase(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="country"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Country</FormLabel>
                                <FormControl>
                                    <Input placeholder="USA" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                </div>
            </div>

            <Separator />

            <div>
                <h4 className="text-base font-semibold text-foreground mb-2">Department Contacts</h4>
                <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField control={form.control} name="reservationsEmail" render={({ field }) => (<FormItem><FormLabel>Reservations Email</FormLabel><FormControl><Input 
                            placeholder="reservations@example.com" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value.replace(/\s/g, ''))}
                            value={field.value ?? ''} 
                        /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="reservationsPhone" render={({ field }) => (<FormItem><FormLabel>Reservations Phone</FormLabel><FormControl><Input 
                            placeholder="+254712345678" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.replace(/\s/g, '').replace(/\./g, ''))}
                            value={field.value ?? ''} 
                        /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="salesMarketingEmail" render={({ field }) => (<FormItem><FormLabel>Sales &amp; Marketing Email</FormLabel><FormControl><Input 
                            placeholder="sales@example.com" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.replace(/\s/g, ''))}
                            value={field.value ?? ''} 
                        /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="salesMarketingPhone" render={({ field }) => (<FormItem><FormLabel>Sales &amp; Marketing Phone</FormLabel><FormControl><Input 
                            placeholder="+254712345678" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.replace(/\s/g, '').replace(/\./g, ''))}
                            value={field.value ?? ''} 
                        /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Details
                </Button>
            </div>
        </form>
    </Form>
  );
}

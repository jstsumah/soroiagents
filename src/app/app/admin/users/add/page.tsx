

"use client";

import { EditUserForm } from "../edit/[uid]/edit-user-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TIERS } from "@/lib/constants";
import { Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { createUser } from "@/services/user-service";

const ROLES: Role[] = ['Agent', 'Admin', 'Super Admin'];

const phoneRegex = new RegExp(
  /^\+[1-9]\d{1,14}$/
);

const addFormSchema = z.object({
  name: z.string().min(3, "Name is required."),
  email: z.string().email("A valid email is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  companyId: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().regex(phoneRegex, 'Phone number must be in international format (e.g., +254712345678).').optional().or(z.literal('')),
  country: z.string().optional(),
  type: z.enum(['local', 'international'], { required_error: "Please select an agent type." }),
  tier: z.enum(TIERS, { required_error: "Please select a tier." }),
  status: z.enum(['active', 'inactive', 'pending'], { required_error: "Please select a status." }),
  role: z.enum(ROLES, { required_error: "Please select a user role."}),
  dmc: z.string().optional(),
  payment_terms: z.string().optional(),
  remarks: z.string().optional(),
  canViewUsers: z.boolean().default(false),
  hasAllTierAccess: z.boolean().default(false),
}).refine((data) => {
    if (data.type === 'international' && !data.dmc) {
        return false;
    }
    return true;
}, {
    message: "DMC is required for international agents.",
    path: ["dmc"],
});


export default function AddUserPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(false);
    
    const form = useForm<z.infer<typeof addFormSchema>>({
    resolver: zodResolver(addFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      companyId: "",
      country: "",
      type: undefined,
      tier: 'Rack Rates',
      status: 'pending',
      role: 'Agent',
      dmc: "",
      payment_terms: "",
      remarks: "",
      canViewUsers: false,
      hasAllTierAccess: false,
    },
  });

  async function handleFormSubmit(values: any) {
    setIsLoading(true);

    try {
        if (!values.password) {
            toast({ variant: 'destructive', title: 'Error', description: 'Password is required for new users.' });
            setIsLoading(false);
            return;
        }
        const { toastMessage } = await createUser({
            email: values.email,
            password: values.password,
            ...values
        });
        toast({ title: "User Created!", description: toastMessage || `The account for ${values.name} has been created.` });
        router.push('/app/admin/users');
        router.refresh();

    } catch (error: any) {
      console.error("Failed to create user:", error);
      toast({ variant: "destructive", title: "Save Failed", description: error.message || "An error occurred while creating the user." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New User</h1>
        <p className="text-muted-foreground">
          Fill out the form below to create a new agent account. An email will not be sent; you must share credentials manually.
        </p>
      </div>
      <FormProvider {...form}>
        <EditUserForm onSubmit={form.handleSubmit(handleFormSubmit)}>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
              </Button>
            </div>
        </EditUserForm>
      </FormProvider>
    </div>
  );
}

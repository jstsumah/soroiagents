

"use client";

import { getUser, getUsers, updateUser } from "@/services/user-service";
import { notFound, useRouter } from "next/navigation";
import { EditUserForm } from "./edit-user-form";
import * as React from 'react';
import type { User, Role, Tier } from "@/lib/types";
import { UserProfileSkeleton } from "../../[uid]/user-profile-client";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TIERS } from "@/lib/constants";
import { useAuth } from "@/app/app/app-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
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

const ROLES: Role[] = ['Agent', 'Admin', 'Super Admin'];
const phoneRegex = new RegExp(
  /^\+[1-9]\d{1,14}$/
);

const editFormSchema = z.object({
  name: z.string().min(3, "Name is required."),
  email: z.string().email("A valid email is required."),
  password: z.string().optional(),
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


export default function EditUserPage({ params }: { params: { uid: string } }) {
    const { uid } = React.use(params);
    const { toast } = useToast();
    const router = useRouter();
    const { user: viewingUser } = useAuth();
    const [user, setUser] = React.useState<User | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [tierChangeConfirmation, setTierChangeConfirmation] = React.useState<any | null>(null);

    const form = useForm<z.infer<typeof editFormSchema>>({
      resolver: zodResolver(editFormSchema)
    });

    React.useEffect(() => {
        // Permission check
        if (!isAuthLoading && viewingUser && viewingUser.role === 'Agent' && viewingUser.uid !== uid) {
            router.replace('/app/agent/dashboard');
        }
    }, [viewingUser?.role, viewingUser?.uid, isAuthLoading, router, uid]);

    React.useEffect(() => {
        const fetchUser = async () => {
            // Only show skeleton if we don't have user data yet
            if (!user) {
                setIsLoading(true);
            }
            try {
                const userData = await getUser(uid);
                if (!userData) {
                    notFound();
                }
                setUser(userData);
                form.reset({
                    ...userData,
                    password: '', // Never populate password field
                    phone: userData.phone || '',
                    company: userData.company || '',
                    companyId: userData.companyId || '',
                    country: userData.country || '',
                    dmc: userData.dmc || '',
                    payment_terms: userData.payment_terms || '',
                    remarks: userData.remarks || '',
                    canViewUsers: userData.canViewUsers || false,
                    hasAllTierAccess: userData.hasAllTierAccess || false,
                });
            } catch (error) {
                console.error("Failed to fetch user:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUser();
    }, [uid, form]); // form is stable, uid is the key dependency

    async function handleFormSubmit(values: any) {
        setIsSaving(true);

        try {
          console.log('[handleFormSubmit] values.status =', values.status);
          const payload: Partial<User> & {password?: string} = { ...values };
          console.log('[handleFormSubmit] payload.status =', payload.status);
          if (user) {
            if (viewingUser?.role !== 'Super Admin' && values.tier === 'Platinum') {
                toast({
                    variant: "destructive",
                    title: "Not Allowed",
                    description: "Contact Administrator to assign Platinum tier.",
                });
                form.setValue('tier', user.tier); // Revert tier change
                setIsSaving(false);
                return;
            }

            await updateUser(user.uid, payload);
            toast({ title: "User Updated!", description: `The account for ${values.name} has been saved.` });
            if (viewingUser?.role === 'Admin' || viewingUser?.role === 'Super Admin') {
                router.push('/app/admin/users');
            } else {
                router.push('/app/agent/profile');
            }
            router.refresh();
          }
        } catch (error: any) {
          console.error("Failed to save user:", error);
          toast({ variant: "destructive", title: "Save Failed", description: error.message || "An error occurred while saving the user data." });
        } finally {
          setIsSaving(false);
          setTierChangeConfirmation(null);
        }
    }

    const attemptSubmit = async (values: any) => {
        console.log('[attemptSubmit] values =', JSON.stringify({ ...values, password: values.password ? '***' : undefined }));
        if (!user || values.tier === user.tier) {
          handleFormSubmit(values);
          return;
        }
    
        const allUsers = await getUsers();
        const colleagues = allUsers.filter(u => u.company === user.company && u.uid !== user.uid);
        if (colleagues.length > 0) {
            const isMixedTier = colleagues.some(c => c.tier !== values.tier);
            if (isMixedTier) {
                setTierChangeConfirmation(values);
                return;
            }
        }
    
        handleFormSubmit(values);
    };

    if (isLoading) {
        return <UserProfileSkeleton />;
    }
    
    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
          <p className="text-muted-foreground">
            Modify the details for &quot;{user!.name}&quot;.
          </p>
        </div>
        <AlertDialog open={!!tierChangeConfirmation} onOpenChange={(isOpen) => !isOpen && setTierChangeConfirmation(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Tier Change</AlertDialogTitle>
                <AlertDialogDescription>
                This user&apos;s colleagues are on a different tier. Changing this user to <strong>{tierChangeConfirmation?.tier}</strong> will result in a tier mismatch within the company. Are you sure you want to proceed?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setTierChangeConfirmation(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => tierChangeConfirmation && handleFormSubmit(tierChangeConfirmation)}>
                Confirm
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <FormProvider {...form}>
           <EditUserForm user={user!} onSubmit={form.handleSubmit(attemptSubmit)}>
             <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
           </EditUserForm>
        </FormProvider>
      </div>
    );
}

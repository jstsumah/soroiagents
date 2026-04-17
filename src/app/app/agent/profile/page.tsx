
"use client";

import { notFound, useRouter } from "next/navigation";
import { EditUserForm } from '../../admin/users/edit/[uid]/edit-user-form';
import { useAuth } from '@/app/app/app-provider';
import { UserProfileSkeleton } from '../../admin/users/[uid]/user-profile-client';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { TIERS } from '@/lib/constants';
import type { Role, User } from '@/lib/types';
import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { updateUser } from '@/services/user-service';
import { ChangePasswordForm } from '@/components/auth/change-password-form';


const ROLES: Role[] = ['Agent', 'Admin', 'Super Admin'];
const phoneRegex = new RegExp(
  /^\+[1-9]\d{1,14}$/
);

const formSchema = z.object({
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
}).refine((data) => {
    if (data.type === 'international' && !data.dmc) {
        return false;
    }
    return true;
}, {
    message: "DMC is required for international agents.",
    path: ["dmc"],
});


function AgentProfileForm({ agent }: { agent: User }) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...agent,
      password: '',
      phone: agent.phone || '',
      country: agent.country || '',
      dmc: agent.dmc || '',
      payment_terms: agent.payment_terms || '',
      remarks: agent.remarks || '',
    },
  });

  async function handleFormSubmit(values: any) {
    setIsSaving(true);
    try {
      await updateUser(agent.uid, values);
      toast({ title: "Profile Updated!", description: "Your information has been successfully saved." });
      router.refresh();
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "An error occurred while saving your profile." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormProvider {...form}>
      <EditUserForm user={agent} onSubmit={form.handleSubmit(handleFormSubmit)}>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </EditUserForm>
    </FormProvider>
  );
}


export default function AgentProfilePage() {
  const { user: agent, isLoading } = useAuth();
  
  if (isLoading) {
    return <UserProfileSkeleton />;
  }

  if (!agent) {
    return notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          View and update your personal and company information.
        </p>
      </div>
      <AgentProfileForm agent={agent} />
      <ChangePasswordForm />
    </div>
  );
}

    

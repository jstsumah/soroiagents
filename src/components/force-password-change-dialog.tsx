

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import { updateUser } from "@/services/user-service";
import { updateUserPassword } from "@/services/admin-service";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { useAuth } from "@/app/app/app-provider";
import * as React from "react";


interface ForcePasswordChangeDialogProps {
  isOpen: boolean;
  onPasswordChanged: () => void;
}

const formSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});


export function ForcePasswordChangeDialog({ isOpen, onPasswordChanged }: ForcePasswordChangeDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(isOpen);

  // Sync internal state with prop
  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleUpdatePassword = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "User not found." });
        return;
    }
    setIsLoading(true);
    try {
      await updateUserPassword(values.newPassword);
      // Explicitly set the flag to false after a successful password change.
      await updateUser(user.uid, { passwordResetRequired: false });
      
      toast({
        title: "Password Updated!",
        description: "Your new password has been set. Welcome to the portal!",
      });
      setOpen(false); // Auto-close on success
      onPasswordChanged();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "An unknown error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeepCurrent = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await updateUser(user.uid, { passwordResetRequired: false });
      toast({
        title: "Preference Saved",
        description: "You've chosen to keep your current password. You can change it anytime in your profile settings.",
      });
      setOpen(false);
      onPasswordChanged();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save your preference.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
           <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary mb-4">
                <KeyRound className="h-6 w-6 text-primary-foreground" />
            </div>
          <DialogTitle className="text-center text-2xl">Update Your Password?</DialogTitle>
          <DialogDescription className="text-center">
            You have successfully set your password. Would you like to update it to something else or continue with the one you just used?
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdatePassword)} className="space-y-4 pt-4">
                 <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                            <PasswordInput placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                            <PasswordInput placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter className="flex flex-col gap-2 pt-4 sm:flex-col">
                    <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Update Password
                    </Button>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        disabled={isLoading} 
                        className="w-full"
                        onClick={handleKeepCurrent}
                    >
                        Keep Current Password
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


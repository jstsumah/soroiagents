"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, Eye, EyeOff, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getUser, updateUser, getUserByEmail, sendPasswordResetEmail, attemptLegacyLoginFallback } from "@/services/user-service";
import { logActivity } from "@/services/audit-log-service";

const emailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
});

const passwordSchema = z.object({
    password: z.string().min(1, { message: "Password is required." }),
});

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [userEmail, setUserEmail] = useState('');

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });
  
  const handleEmailStep = async (values: z.infer<typeof emailSchema>) => {
    setIsLoading(true);
    try {
        const user = await getUserByEmail(values.email);
        setUserEmail(values.email);

        if (user) {
            setStep('password');
        } else {
            toast({
                variant: 'destructive',
                title: 'Account Not Found',
                description: "No account found with this email. Please check the address or sign up.",
            });
        }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error",
            description: error.message || "An unexpected error occurred.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handlePasswordStep = async (values: z.infer<typeof passwordSchema>) => {
    if (!supabase) {
        toast({
            variant: "destructive",
            title: "Configuration Error",
            description: "Supabase is not configured correctly. Please check environment variables.",
        });
        return;
    }
    setIsLoading(true);
     try {
      let { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: values.password,
      });

      // Legacy fallback: if login fails, try to capture and set the password for first-time users
      if (error) {
          const migrated = await attemptLegacyLoginFallback(userEmail, values.password);
          if (migrated) {
              // Try login again after setting the password
              const retry = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: values.password,
              });
              data = retry.data;
              error = retry.error;
          }
      }

      if (error) throw error;
      if (!data.user) throw new Error("Login failed");

      const userProfile = await getUser(data.user.id);

      if (!userProfile) {
         throw new Error("User profile not found in database.");
      }
      
      if (userProfile.status === 'inactive') {
          await supabase.auth.signOut();
          toast({
              variant: "destructive",
              title: "Access Denied",
              description: `Your account is currently inactive. Please contact an administrator for assistance.`,
          });
          setIsLoading(false);
          return;
      }
      
      const updates: Partial<any> = { last_seen: new Date() };
      await updateUser(userProfile.uid, updates);

      await logActivity({ userId: userProfile.uid, userName: userProfile.name, action: 'auth.login' });
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${userProfile?.name}! Redirecting...`,
      });
      
      if (userProfile.role === 'Admin' || userProfile.role === 'Super Admin') {
        router.push("/app/admin/dashboard");
      } else {
        router.push("/app/agent/dashboard");
      }
      router.refresh();

    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid email or password.",
      });
    } finally {
        setIsLoading(false);
    }
  }
  
  const goBackToEmail = () => {
    setStep('email');
    passwordForm.reset();
  }

  if (step === 'password') {
    return (
        <Form {...passwordForm}>
            <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{userEmail}</span>
            </div>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordStep)} className="space-y-6">
                <FormField
                    control={passwordForm.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <div className="flex items-center justify-between">
                            <FormLabel>Password</FormLabel>
                            <Link
                            href="/forgot-password"
                            className="text-sm font-medium text-primary hover:underline"
                            >
                            Forgot Password?
                            </Link>
                        </div>
                        <FormControl>
                            <PasswordInput placeholder="••••••••" {...field} autoFocus />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="flex w-full gap-2">
                    <Button type="button" variant="outline" onClick={goBackToEmail} className="w-1/2">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" disabled={isLoading} className="w-1/2">
                    {isLoading && <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />}
                    Sign In
                    </Button>
                 </div>
            </form>
        </Form>
    )
  }

  return (
    <Form {...emailForm}>
      <form onSubmit={emailForm.handleSubmit(handleEmailStep)} className="space-y-6">
        <FormField
          control={emailForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input 
                    placeholder="name@example.com" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.replace(/\s/g, '').toLowerCase())} 
                    autoFocus 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />}
          Proceed
        </Button>
      </form>
    </Form>
  );
}

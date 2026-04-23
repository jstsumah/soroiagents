"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, ShieldCheck } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { updateUser } from "@/services/user-service";
import { getCompanyDetails } from "@/services/settings-service";
import type { CompanyDetails } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const fetchBrand = async () => {
        try {
            const details = await getCompanyDetails();
            setCompanyDetails(details);
        } catch (e) {}
    };
    fetchBrand();

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          variant: "destructive",
          title: "Session Expired",
          description: "Your password reset link is invalid or has expired.",
        });
        router.replace("/");
        return;
      }
      setIsVerifying(false);
    };

    checkSession();
  }, [supabase, router, toast]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password
      });

      if (error) throw error;

      // Update the profile flag as well if it was set
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          await updateUser(user.id, { passwordResetRequired: false });
      }

      toast({
        title: "Password Updated",
        description: "Your password has been reset successfully. You are now being redirected.",
      });

      setTimeout(() => {
        router.replace("/app");
      }, 2000);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
      setIsLoading(false);
    }
  };

  const loginBgUrl = companyDetails?.loginBgUrl;
  const loginBgType = companyDetails?.loginBgType || 'image';
  const loginBgColor = companyDetails?.loginBgColor || '#FFFFFF';

  const bgStyle = loginBgType === 'image' && loginBgUrl 
    ? { backgroundImage: `url('${loginBgUrl}')` }
    : { backgroundColor: loginBgColor };

  return (
    <div 
      className="flex h-screen overflow-y-auto items-center justify-center bg-background p-4 bg-cover bg-center"
      style={bgStyle}
    >
      {loginBgType === 'image' && <div className="absolute inset-0 bg-black/50 z-0"></div>}
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary relative z-10 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          {isVerifying ? (
            <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-64" />
            </div>
          ) : (
            <>
                <CardTitle className="text-2xl font-bold tracking-tight">Set New Password</CardTitle>
                <CardDescription>
                    Choose a strong password to protect your account.
                </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {isVerifying ? (
            <div className="flex flex-col gap-4 py-4">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
            </div>
          ) : (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                        <PasswordInput 
                            placeholder="••••••••" 
                            {...field} 
                            className="bg-muted/10 h-11"
                        />
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
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                        <PasswordInput 
                            placeholder="••••••••" 
                            {...field} 
                            className="bg-muted/10 h-11"
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.01]" disabled={isLoading}>
                    {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                    </>
                    ) : (
                    "Reset Password"
                    )}
                </Button>
                </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 text-center pb-8">
            <p className="text-xs text-muted-foreground px-4">
                Tip: Use a combination of uppercase, lowercase, numbers, and symbols for maximum security.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}

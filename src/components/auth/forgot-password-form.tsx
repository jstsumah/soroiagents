
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { sendPasswordResetEmail } from "@/services/user-service";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
});

export function ForgotPasswordForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(values.email);
      toast({
        title: "Check your email",
        description: `A password reset link has been sent to ${values.email}.`,
      });
      router.push("/");
    } catch (error: any) {
      let description = "An unexpected error occurred. Please try again.";
      if (error && typeof error === 'object' && 'code' in error) {
        switch (error.code) {
          case 'auth/user-not-found':
            description = "No account found with this email address. Please check your email and try again.";
            break;
          case 'auth/network-request-failed':
            description = "Network error. Please check your internet connection and try again.";
            break;
          default:
            description = "An unknown error occurred. Please contact support if the problem persists.";
            break;
        }
      }
      toast({
        variant: "destructive",
        title: "Request Failed",
        description,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input 
                    placeholder="name@example.com" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.replace(/\s/g, '').toLowerCase())}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />}
          Send Reset Link
        </Button>
      </form>
    </Form>
  );
}

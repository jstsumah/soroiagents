

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
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { createUser, getUserByEmail, sendAdminNewUserEmail } from "@/services/user-service";

const emailCheckSchema = z.object({
  name: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
});

const fullFormSchema = z.object({
  name: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  company: z.string().min(3, { message: "Company name is required." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  type: z.enum(['local', 'international'], { required_error: "Please select your agent type." }),
});


export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'emailCheck' | 'details'>('emailCheck');

  const form = useForm<z.infer<typeof fullFormSchema>>({
    resolver: zodResolver(step === 'emailCheck' ? emailCheckSchema : fullFormSchema),
    defaultValues: {
      name: "",
      company: "",
      email: "",
      password: "",
    },
  });
  
  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\b(\w)/g, s => s.toUpperCase());
  };

  const handleEmailCheck = async (values: z.infer<typeof emailCheckSchema>) => {
    setIsLoading(true);
    try {
        const existingUser = await getUserByEmail(values.email);
        if (existingUser) {
            toast({
                variant: 'destructive',
                title: 'Account Already Exists',
                description: "An account with this email already exists. Please log in.",
            });
            router.push('/'); // Redirect to login
        } else {
            setStep('details'); // Proceed to the next step
        }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "An unexpected error occurred while checking your email.",
        });
    } finally {
        setIsLoading(false);
    }
  }

  async function onFullSubmit(values: z.infer<typeof fullFormSchema>) {
    setIsLoading(true);
    
    try {
      // Use the new createUser service function which handles both Auth and Firestore
      const { toastMessage } = await createUser({
        email: values.email,
        password: values.password,
        name: values.name,
        company: values.company,
        type: values.type,
      });

      // After successful creation, send notification to admin
      await sendAdminNewUserEmail({
          name: values.name,
          email: values.email,
          company: values.company,
      });
      
      toast({
        title: "Registration Successful!",
        description: toastMessage || "Your account is pending approval. Please sign in to complete your profile.",
      });
      
      router.push("/");

    } catch (error: any) {
       console.error("Signup failed:", error);
       let description = "An error occurred during registration. Please try again.";

        if (error.message.includes('auth/email-already-in-use') || error.message.includes('A user with email')) {
            description = "This email address is already registered. Please sign in or use a different email.";
        }
       
       toast({
        variant: "destructive",
        title: "Registration Failed",
        description: description,
       });
    } finally {
        setIsLoading(false);
    }
  }
  
  const onSubmit = step === 'emailCheck' ? form.handleSubmit(handleEmailCheck) : form.handleSubmit(onFullSubmit);

  const goBackToEmailCheck = () => {
    setStep('emailCheck');
    form.clearErrors();
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        {step === 'details' && (
            <Button
                type="button"
                variant="ghost"
                className="mb-4 text-muted-foreground"
                onClick={goBackToEmailCheck}
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} onChange={(e) => field.onChange(toTitleCase(e.target.value))} disabled={step === 'details'} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                    disabled={step === 'details'}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {step === 'details' && (
            <>
                <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                        <Input placeholder="Safari Ventures Inc." {...field} onChange={(e) => field.onChange(toTitleCase(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                        <PasswordInput placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Agent Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select your agent type" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="local">Local</SelectItem>
                                <SelectItem value="international">International</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
            </>
        )}

        <Button type="submit" className="w-full !mt-6" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />}
          {step === 'emailCheck' ? "Proceed" : "Create Account"}
        </Button>
      </form>
    </Form>
  );
}

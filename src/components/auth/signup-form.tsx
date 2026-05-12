

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
import { cn } from "@/lib/utils";
import { countries } from "@/lib/countries";
import { 
    ScrollArea 
} from "@/components/ui/scroll-area";
import { createUser, getUserByEmail, sendAdminNewUserEmail } from "@/services/user-service";

const emailCheckSchema = z.object({
  name: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
});

const phoneRegex = new RegExp(
  /^\+[1-9]\d{1,14}$/
);

const fullFormSchema = z.object({
  name: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  company: z.string().min(3, { message: "Company name is required." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  type: z.enum(['local', 'international'], { required_error: "Please select your agent type." }),
  phone: z.string().regex(phoneRegex, 'Phone number must be in international format (e.g., +254712345678).'),
  country: z.string().min(2, { message: "Country is required." }),
  dmc: z.string().optional(),
}).refine((data) => {
    if (data.type === 'international' && !data.dmc) {
        return false;
    }
    return true;
}, {
    message: "DMC is required for international agents.",
    path: ["dmc"],
});


export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'identity' | 'agency' | 'account'>('identity');

  const form = useForm<z.infer<typeof fullFormSchema>>({
    resolver: zodResolver(step === 'identity' ? emailCheckSchema : fullFormSchema),
    defaultValues: {
      name: "",
      company: "",
      email: "",
      password: "",
      phone: "",
      country: "",
      dmc: "",
      type: "local",
    },
  });
  
  const agentType = form.watch("type");

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\b(\w)/g, s => s.toUpperCase());
  };

  const handleStep1 = async (values: z.infer<typeof emailCheckSchema>) => {
    setIsLoading(true);
    try {
        const existingUser = await getUserByEmail(values.email);
        if (existingUser) {
            toast({
                variant: 'destructive',
                title: 'Account Already Exists',
                description: "An account with this email already exists. Please log in.",
            });
            router.push('/');
        } else {
            setStep('agency');
        }
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "An error occurred while checking your email." });
    } finally {
        setIsLoading(false);
    }
  }

  const handleStep2 = async () => {
    const isValid = await form.trigger(['company', 'phone', 'country']);
    if (isValid) {
        setStep('account');
    }
  }

  async function onFullSubmit(values: z.infer<typeof fullFormSchema>) {
    setIsLoading(true);
    try {
      const { toastMessage } = await createUser({
        email: values.email,
        password: values.password,
        name: values.name,
        company: values.company,
        type: values.type,
        phone: values.phone,
        country: values.country,
        dmc: values.dmc,
      });

      await sendAdminNewUserEmail({
          name: values.name,
          email: values.email,
          company: values.company,
      });
      
      toast({ title: "Registration Successful!", description: toastMessage || "Your account is pending approval." });
      router.push("/");
    } catch (error: any) {
       console.error("Signup failed:", error);
       toast({ variant: "destructive", title: "Registration Failed", description: error.message || "An error occurred." });
    } finally {
        setIsLoading(false);
    }
  }

  const goBack = () => {
    if (step === 'agency') setStep('identity');
    if (step === 'account') setStep('agency');
    form.clearErrors();
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2 w-full">
                <div className={cn("h-1 flex-1 rounded-full", step === 'identity' ? "bg-primary" : "bg-primary/20")} />
                <div className={cn("h-1 flex-1 rounded-full", step === 'agency' ? "bg-primary" : "bg-primary/20")} />
                <div className={cn("h-1 flex-1 rounded-full", step === 'account' ? "bg-primary" : "bg-primary/20")} />
            </div>
        </div>

        {step !== 'identity' && (
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mb-2 h-8 px-2 text-muted-foreground"
                onClick={goBack}
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
        )}

        {step === 'identity' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                            <Input placeholder="John Doe" {...field} onChange={(e) => field.onChange(toTitleCase(e.target.value))} />
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
                            <Input placeholder="name@example.com" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\s/g, '').toLowerCase())} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <Button onClick={form.handleSubmit(handleStep1)} className="w-full mt-4" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Next: Agency Details
                </Button>
            </div>
        )}

        {step === 'agency' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
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
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                            <Input placeholder="+254712345678" {...field} />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Country" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <ScrollArea className="h-72">
                                    {countries.map((country) => (
                                        <SelectItem key={country} value={country}>
                                            {country}
                                        </SelectItem>
                                    ))}
                                </ScrollArea>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <Button onClick={handleStep2} className="w-full mt-4">
                    Next: Account Setup
                </Button>
            </div>
        )}

        {step === 'account' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Agent Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="local">Local</SelectItem>
                                <SelectItem value="international">International</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />

                {agentType === 'international' && (
                    <FormField
                        control={form.control}
                        name="dmc"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>DMC Name</FormLabel>
                            <FormControl>
                                <Input placeholder="DMC Ltd" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Set Password</FormLabel>
                        <FormControl>
                            <PasswordInput placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <Button onClick={form.handleSubmit(onFullSubmit)} className="w-full mt-4" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create My Account
                </Button>
            </div>
        )}
      </form>
    </Form>
  );
}

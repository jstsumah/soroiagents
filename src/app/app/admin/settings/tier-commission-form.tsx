
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState, useTransition } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2 } from "lucide-react";
import { TIERS } from "@/lib/constants";
import type { Tier, TierCommissions } from "@/lib/types";
import { saveTierCommissions, getTierCommissions } from "@/services/settings-service";
import { Skeleton } from "@/components/ui/skeleton";
import { Control } from "react-hook-form";

const formSchema = z.object({
  Brass: z.coerce.number().min(0, "Cannot be negative.").max(100, "Cannot exceed 100."),
  Bronze: z.coerce.number().min(0, "Cannot be negative.").max(100, "Cannot exceed 100."),
  Silver: z.coerce.number().min(0, "Cannot be negative.").max(100, "Cannot exceed 100."),
  Gold: z.coerce.number().min(0, "Cannot be negative.").max(100, "Cannot exceed 100."),
  Preferred: z.coerce.number().min(0, "Cannot be negative.").max(100, "Cannot exceed 100."),
  "Super Preferred": z.coerce.number().min(0, "Cannot be negative.").max(100, "Cannot exceed 100."),
  Platinum: z.coerce.number().min(0, "Cannot be negative.").max(100, "Cannot exceed 100."),
  "Rack Rates": z.coerce.number().min(0, "Cannot be negative.").max(100, "Cannot exceed 100."),
});

// Stable sub-component outside the parent — prevents remount on every render
function CommissionInput({ name, label, control }: {
  name: Tier;
  label: string;
  control: Control<z.infer<typeof formSchema>>;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="relative">
            <FormControl>
              <Input type="number" placeholder="e.g. 15" {...field} className="pr-8" />
            </FormControl>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground text-sm">%</div>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}


export function TierCommissionForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaving] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      Brass: 10,
      Bronze: 12,
      Silver: 15,
      Gold: 18,
      Preferred: 20,
      "Super Preferred": 25,
      Platinum: 40,
      "Rack Rates": 0,
    },
  });

  useEffect(() => {
    const fetchAndSetCommissions = async () => {
        setIsLoading(true);
        const savedCommissions = await getTierCommissions();
        if (savedCommissions) {
            form.reset(savedCommissions);
        }
        setIsLoading(false);
    };
    fetchAndSetCommissions();
  }, [form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    startSaving(async () => {
        await saveTierCommissions(values);
        toast({
            title: "Commissions Saved!",
            description: "The tier commission levels have been updated.",
        });
    });
  }


  
  if (isLoading) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
               {TIERS.map(tier => <Skeleton key={tier} className="h-20 w-full" />)}
            </div>
             <div className="flex justify-end">
                <Skeleton className="h-10 w-36" />
            </div>
        </div>
    )
  }


  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {TIERS.map(tier => <CommissionInput key={tier} name={tier} label={tier} control={form.control} />)}
            </div>
            <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Commissions
                </Button>
            </div>
        </form>
    </Form>
  );
}

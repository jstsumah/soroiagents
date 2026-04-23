
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2 } from "lucide-react";
import { TIERS } from "@/lib/constants";
import type { Tier } from "@/lib/types";
import { saveTierColors, getTierColors } from "@/services/settings-service";
import { Skeleton } from "@/components/ui/skeleton";
import { Control } from "react-hook-form";

const hexColorSchema = z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color");

const formSchema = z.object({
  Brass: hexColorSchema,
  Bronze: hexColorSchema,
  Silver: hexColorSchema,
  Gold: hexColorSchema,
  Preferred: hexColorSchema,
  "Super Preferred": hexColorSchema,
  Platinum: hexColorSchema,
  "Rack Rates": hexColorSchema,
});

type TierColors = Record<Tier, string>;

// Stable sub-component outside the parent — prevents remount on every render
function ColorInput({ name, label, control }: {
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
          <div className="flex items-center gap-2">
            <FormControl>
              <Input placeholder="#RRGGBB" {...field} />
            </FormControl>
            <div className="h-10 w-16 rounded-md border" style={{ backgroundColor: field.value }} />
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function TierColorsForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaving] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      Brass: "#b08d57",
      Bronze: "#cd7f32",
      Silver: "#c0c0c0",
      Gold: "#f59e0b",
      Preferred: "#7e22ce",
      "Super Preferred": "#e11d48",
      Platinum: "#e5e4e2",
      "Rack Rates": "#888888",
    },
  });

  useEffect(() => {
    const fetchAndSetColors = async () => {
        setIsLoading(true);
        const savedColors = await getTierColors();
        if (savedColors) {
            form.reset(savedColors);
        }
        setIsLoading(false);
    };
    fetchAndSetColors();
  }, [form]);
  
  const watchedColors = form.watch();

  useEffect(() => {
    const root = document.documentElement;
    (Object.keys(watchedColors) as Tier[]).forEach(tier => {
        const color = watchedColors[tier];
        if (color) {
            root.style.setProperty(`--tier-${tier.toLowerCase().replace(' ', '-')}`, color);
        }
    });
  }, [watchedColors]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    startSaving(async () => {
        await saveTierColors(values);
        toast({
            title: "Tier Colors Saved!",
            description: "Your custom tier colors have been applied.",
        });
    });
  }


  
  if (isLoading) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
               {TIERS.map(tier => <Skeleton key={tier} className="h-20 w-full" />)}
            </div>
             <div className="flex justify-end">
                <Skeleton className="h-10 w-32" />
            </div>
        </div>
    )
  }


  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {TIERS.map(tier => <ColorInput key={tier} name={tier} label={tier} control={form.control} />)}
            </div>
            <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Tier Colors
                </Button>
            </div>
        </form>
    </Form>
  );
}

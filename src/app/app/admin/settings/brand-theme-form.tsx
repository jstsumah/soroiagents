
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
import { Paintbrush, Loader2 } from "lucide-react";
import { getBrandTheme, saveBrandTheme } from "@/services/settings-service";
import { Skeleton } from "@/components/ui/skeleton";
import { Control } from "react-hook-form";

const formSchema = z.object({
  primary: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
  background: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
  accent: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
});

// Stable sub-component outside the parent — prevents remount on every render
function ColorInput({ name, label, control }: {
  name: keyof z.infer<typeof formSchema>;
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

// Function to convert hex to HSL string
const hexToHslString = (hex: string): string => {
    if (!hex) return '';
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
}


export function BrandThemeForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaving] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      primary: "#7B6A58",
      background: "#E9E8E7",
      accent: "#B68D6A",
    },
  });
  
  useEffect(() => {
    const fetchAndSetTheme = async () => {
        setIsLoading(true);
        const savedTheme = await getBrandTheme();
        if (savedTheme) {
            form.reset(savedTheme);
        }
        setIsLoading(false);
    };
    fetchAndSetTheme();
  }, [form]);
  
  const watchedColors = form.watch();

  useEffect(() => {
    const root = document.documentElement;
    if (watchedColors.primary) root.style.setProperty('--brand-primary', hexToHslString(watchedColors.primary));
    if (watchedColors.background) root.style.setProperty('--brand-background', hexToHslString(watchedColors.background));
    if (watchedColors.accent) root.style.setProperty('--brand-accent', hexToHslString(watchedColors.accent));
  }, [watchedColors]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    startSaving(async () => {
      await saveBrandTheme(values);
      toast({
        title: "Brand Theme Saved!",
        description: "Your custom brand colors have been applied.",
      });
    });
  }


  
  if (isLoading) {
    return (
        <div className="space-y-4">
             <div className="grid md:grid-cols-3 gap-6">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
             </div>
             <div className="flex justify-end">
                <Skeleton className="h-10 w-44" />
            </div>
        </div>
    )
  }


  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid md:grid-cols-3 gap-6">
            <ColorInput name="primary" label="Primary Color" control={form.control} />
            <ColorInput name="background" label="Background Color" control={form.control} />
            <ColorInput name="accent" label="Accent Color" control={form.control} />
        </div>
        <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Paintbrush className="mr-2 h-4 w-4" />}
              Save Brand Colors
            </Button>
        </div>
        </form>
    </Form>
  );
}

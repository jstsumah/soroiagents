
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
import { Save, Loader2, RefreshCw } from "lucide-react";
import { getMarkdownTheme, saveMarkdownTheme } from "@/services/settings-service";
import { Skeleton } from "@/components/ui/skeleton";
import type { MarkdownTheme } from "@/lib/types";

const hexColorSchema = z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color");

const formSchema = z.object({
  light: z.object({
    body: hexColorSchema,
    headings: hexColorSchema,
    links: hexColorSchema,
    bullets: hexColorSchema,
  }),
  dark: z.object({
    body: hexColorSchema,
    headings: hexColorSchema,
    links: hexColorSchema,
    bullets: hexColorSchema,
  }),
});

const defaultTheme: MarkdownTheme = {
    light: {
        body: "#333333",
        headings: "#111111",
        links: "#0066cc",
        bullets: "#666666",
    },
    dark: {
        body: "#cccccc",
        headings: "#ffffff",
        links: "#8ab4f8",
        bullets: "#999999",
    }
};

export function MarkdownThemeForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaving] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultTheme,
  });

  useEffect(() => {
    const fetchAndSetTheme = async () => {
        setIsLoading(true);
        const savedTheme = await getMarkdownTheme();
        form.reset(savedTheme);
        setIsLoading(false);
    };
    fetchAndSetTheme();
  }, [form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    startSaving(async () => {
      await saveMarkdownTheme(values);
      toast({
        title: "Markdown Theme Saved!",
        description: "Your custom markdown colors have been applied. You may need to refresh to see the changes.",
      });
    });
  }
  
  const handleReset = () => {
    form.reset(defaultTheme);
    toast({
        title: "Theme Reset",
        description: "Colors have been reset to default. Click Save to apply.",
    });
  }

  const ColorInput = ({ name, label }: { name: `light.${keyof MarkdownTheme['light']}` | `dark.${keyof MarkdownTheme['dark']}`, label: string }) => (
    <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
        <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="flex items-center gap-2">
                <FormControl>
                    <Input placeholder="#RRGGBB" {...field} />
                </FormControl>
                <div className="h-10 w-16 rounded-md border" style={{ backgroundColor: field.value }}></div>
            </div>
            <FormMessage />
        </FormItem>
        )}
    />
  );
  
  if (isLoading) {
    return (
        <div className="space-y-4">
             <div className="grid md:grid-cols-2 gap-8">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 rounded-md border p-4">
                    <h4 className="font-medium text-lg">Light Theme</h4>
                    <ColorInput name="light.body" label="Body Text" />
                    <ColorInput name="light.headings" label="Headings" />
                    <ColorInput name="light.links" label="Links" />
                    <ColorInput name="light.bullets" label="Bullets" />
                </div>
                 <div className="space-y-4 rounded-md border p-4 bg-muted/30">
                    <h4 className="font-medium text-lg">Dark Theme</h4>
                    <ColorInput name="dark.body" label="Body Text" />
                    <ColorInput name="dark.headings" label="Headings" />
                    <ColorInput name="dark.links" label="Links" />
                    <ColorInput name="dark.bullets" label="Bullets" />
                </div>
            </div>
        <div className="flex justify-end gap-2">
             <Button type="button" variant="outline" onClick={handleReset} disabled={isSaving}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset to Default
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Markdown Colors
            </Button>
        </div>
        </form>
    </Form>
  );
}

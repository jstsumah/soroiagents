
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as React from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2 } from "lucide-react";
import { getAvailabilityChartSettings, saveAvailabilityChartSettings } from "@/services/settings-service";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  embedCode: z.string().min(10, "Embed code seems too short.").optional().or(z.literal('')),
});

export function AvailabilityChartForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      embedCode: "",
    },
  });
  
  React.useEffect(() => {
    const fetchSettings = async () => {
        setIsLoading(true);
        const settings = await getAvailabilityChartSettings();
        form.reset({ embedCode: settings.embedCode || '' });
        setIsLoading(false);
    };
    fetchSettings();
  }, [form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await saveAvailabilityChartSettings({ embedCode: values.embedCode || '' });
      toast({
        title: "Embed Code Saved!",
        description: "The availability chart embed code has been updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save the embed code.",
      });
    }
  }

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />
  }

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
            control={form.control}
            name="embedCode"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Resova Embed Code</FormLabel>
                <FormControl>
                    <Textarea 
                        placeholder='<div ...><iframe ...></iframe></div>'
                        className="min-h-[120px] font-mono text-sm"
                        {...field}
                        />
                </FormControl>
                <FormDescription>
                    Paste the full HTML code provided by Resova here. This will be displayed on the agent and admin availability pages.
                </FormDescription>
                <FormMessage />
            </FormItem>
            )}
        />
        <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Embed Code
            </Button>
        </div>
        </form>
    </Form>
  );
}

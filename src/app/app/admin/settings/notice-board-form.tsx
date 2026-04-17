
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2 } from "lucide-react";
import { getNoticeBoardSettings, saveNoticeBoardSettings } from "@/services/settings-service";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").optional().or(z.literal('')),
  message: z.string().min(10, "Message must be at least 10 characters.").optional().or(z.literal('')),
});

export function NoticeBoardForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      message: "",
    },
  });
  
  React.useEffect(() => {
    const fetchSettings = async () => {
        setIsLoading(true);
        const settings = await getNoticeBoardSettings();
        form.reset({ 
            title: settings.title || '',
            message: settings.message || '' 
        });
        setIsLoading(false);
    };
    fetchSettings();
  }, [form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      await saveNoticeBoardSettings(values);
      toast({
        title: "Notice Saved!",
        description: "The notice board message has been updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save the notice board message.",
      });
    } finally {
        setIsSaving(false);
    }
  }

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />
  }

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Notice Title</FormLabel>
                    <FormControl>
                        <Input placeholder='e.g., System Maintenance' {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Notice Message</FormLabel>
                    <FormControl>
                        <Textarea 
                            placeholder='Enter the message you want to display on the dashboards...'
                            className="min-h-[120px]"
                            {...field}
                            />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Notice
                </Button>
            </div>
        </form>
    </Form>
  );
}

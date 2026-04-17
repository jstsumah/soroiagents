
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2 } from "lucide-react";
import { getCompanyDetails, saveCompanyDetails } from "@/services/settings-service";
import { Skeleton } from "@/components/ui/skeleton";
import { settingsEmitter } from "@/components/settings-emitter";

const formSchema = z.object({
  n8nChatbotUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
});

export function N8nChatbotForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      n8nChatbotUrl: "",
    },
  });
  
  React.useEffect(() => {
    const fetchSettings = async () => {
        setIsLoading(true);
        const settings = await getCompanyDetails();
        form.reset({ n8nChatbotUrl: settings.n8nChatbotUrl || '' });
        setIsLoading(false);
    };
    fetchSettings();
  }, [form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      await saveCompanyDetails({ n8nChatbotUrl: values.n8nChatbotUrl || '' });
      settingsEmitter.emit(); // Notify components of the change
      toast({
        title: "Chatbot URL Saved!",
        description: "The n8n chatbot URL has been updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save the chatbot URL.",
      });
    } finally {
        setIsSaving(false);
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
            name="n8nChatbotUrl"
            render={({ field }) => (
            <FormItem>
                <FormLabel>n8n Chatbot Webhook URL</FormLabel>
                <FormControl>
                    <Input 
                        placeholder='https://n8n.example.com/webhook/...'
                        {...field}
                        value={field.value ?? ''}
                        />
                </FormControl>
                <FormDescription>
                    Paste the full webhook URL for your n8n chatbot here. If provided, this will replace the built-in support chat.
                </FormDescription>
                <FormMessage />
            </FormItem>
            )}
        />
        <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Chatbot URL
            </Button>
        </div>
        </form>
    </Form>
  );
}

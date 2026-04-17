
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
import { Save, Loader2, Info } from "lucide-react";
import type { EmailTemplate } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters."),
  body: z.string().min(20, "Body must be at least 20 characters."),
});

interface EmailTemplateFormProps {
  template: EmailTemplate;
  onSave: (data: Omit<EmailTemplate, 'id' | 'name' | 'placeholders'>) => Promise<void>;
}

export function EmailTemplateForm({ template, onSave }: EmailTemplateFormProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: template.subject,
      body: template.body,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      await onSave(values);
      toast({
        title: "Template Saved!",
        description: `The "${template.name}" email template has been updated.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save the email template.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center gap-2 p-3 rounded-md bg-muted border">
            <Info className="h-5 w-5 text-muted-foreground shrink-0"/>
            <div className="text-sm text-muted-foreground">
                Available Placeholders: {template.placeholders.map(p => <Badge key={p} variant="outline" className="font-mono">{`{{${p}}}`}</Badge>)}
            </div>
        </div>
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Subject</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Welcome to Our Portal!" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Body</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter the HTML body of your email..."
                  className="min-h-[250px] font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                You can use HTML for formatting. Use the placeholders above to insert dynamic content.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Template
          </Button>
        </div>
      </form>
    </Form>
  );
}

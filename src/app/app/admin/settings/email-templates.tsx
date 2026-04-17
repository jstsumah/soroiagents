
"use client";

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { EmailTemplateForm } from './email-template-form';
import type { EmailTemplate } from '@/lib/types';
import { getEmailTemplates, saveEmailTemplate } from '@/services/email-template-service';

export function EmailTemplates() {
  const [templates, setTemplates] = React.useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      const fetchedTemplates = await getEmailTemplates();
      setTemplates(fetchedTemplates);
      setIsLoading(false);
    };
    fetchTemplates();
  }, []);

  const handleSave = async (id: EmailTemplate['id'], data: Omit<EmailTemplate, 'id' | 'name' | 'placeholders'>) => {
    await saveEmailTemplate({ id, ...data });
    // Refetch to ensure we have the latest data
    const fetchedTemplates = await getEmailTemplates();
    setTemplates(fetchedTemplates);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templates.length === 0) {
    return <p className="text-muted-foreground">No email templates have been configured.</p>;
  }

  return (
    <Tabs defaultValue={templates[0].id} className="w-full">
      <TabsList>
        {templates.map(template => (
          <TabsTrigger key={template.id} value={template.id}>
            {template.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {templates.map(template => (
        <TabsContent key={template.id} value={template.id}>
          <EmailTemplateForm
            template={template}
            onSave={(data) => handleSave(template.id, data)}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

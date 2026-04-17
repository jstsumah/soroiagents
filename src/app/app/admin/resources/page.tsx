
"use client";

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceUploadForm } from "./resource-upload-form";
import { ResourceTable } from "./resource-table";
import { getResources } from "@/services/resource-service";
import type { Resource } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function AdminResourcesPage() {
  const [resources, setResources] = React.useState<Resource[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchResources = async () => {
      setIsLoading(true);
      const res = await getResources();
      setResources(res);
      setIsLoading(false);
    };
    fetchResources();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
        <p className="text-muted-foreground">
          Upload and manage resources for your agents.
        </p>
      </div>
      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="all">All Resources</TabsTrigger>
          <TabsTrigger value="add">Add New</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResourceTable resources={resources} />
          )}
        </TabsContent>
        <TabsContent value="add" className="mt-4">
          <ResourceUploadForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

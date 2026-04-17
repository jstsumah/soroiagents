
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarCheck, Loader2 } from "lucide-react";
import * as React from 'react';
import { getAvailabilityChartSettings } from "@/services/settings-service";
import { DynamicEmbed } from "@/components/dynamic-embed";

export default function AvailabilityChartPage() {
  const [embedCode, setEmbedCode] = React.useState<string | undefined>('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const settings = await getAvailabilityChartSettings();
      setEmbedCode(settings.embedCode);
      setIsLoading(false);
    };
    fetchSettings();
  }, []);
  
  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Availability Chart</h1>
        <p className="text-muted-foreground">
          Live view of availability across all properties.
        </p>
      </div>

       {embedCode ? (
         <Card className="bg-white">
            <CardContent className="p-0 overflow-hidden">
                <DynamicEmbed code={embedCode} />
            </CardContent>
         </Card>
       ) : (
        <Alert>
            <CalendarCheck className="h-4 w-4" />
            <AlertTitle>Chart Not Available</AlertTitle>
            <AlertDescription>
              The availability chart has not been configured by an administrator. Please check back later.
            </AlertDescription>
        </Alert>
       )}
    </div>
  );
}

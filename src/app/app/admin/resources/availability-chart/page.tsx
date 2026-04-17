
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarCheck, Loader2 } from "lucide-react";
import * as React from 'react';
import { getAvailabilityChartSettings } from "@/services/settings-service";
import { DynamicEmbed } from "@/components/dynamic-embed";
import { useAuth } from "../../../app-provider";
import { useRouter } from "next/navigation";

export default function AvailabilityChartPage() {
  const [embedCode, setEmbedCode] = React.useState<string | undefined>('');
  const [isLoading, setIsLoading] = React.useState(true);
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isAuthLoading && user && user.role === 'Agent') {
      router.replace('/app/agent/dashboard');
      return;
    }
    
    const fetchSettings = async () => {
      setIsLoading(true);
      const settings = await getAvailabilityChartSettings();
      setEmbedCode(settings.embedCode);
      setIsLoading(false);
    };
    
    if (user) {
        fetchSettings();
    }
  }, [user, isAuthLoading, router]);

  if (isLoading || isAuthLoading) {
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
            <AlertTitle>No Chart Configured</AlertTitle>
            <AlertDescription>
              The availability chart has not been configured yet. An administrator needs to embed the code in the system settings.
            </AlertDescription>
        </Alert>
       )}
    </div>
  );
}

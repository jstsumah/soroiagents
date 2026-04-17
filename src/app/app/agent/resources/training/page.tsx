

"use client";

import * as React from "react";
import type { Tier, TrainingResource, User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { BookMarked, Loader2 } from "lucide-react";
import { useAuth } from "@/app/app/app-provider";
import { getUser } from "@/services/user-service";
import { getTrainingResources } from "@/services/training-resource-service";
import { useToast } from "@/hooks/use-toast";

export default function AgentTrainingPage() {
  const { user: currentAgent, isLoading: authLoading } = useAuth();
  const [allResources, setAllResources] = React.useState<TrainingResource[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchData = async () => {
        if (currentAgent) {
            try {
                const resources = await getTrainingResources();
                setAllResources(resources);
            } catch (error) {
                console.error("Failed to fetch data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load training resources.' });
            } finally {
                setIsLoading(false);
            }
        } else if (!authLoading) {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [currentAgent, authLoading, toast]);
  
  if (isLoading || authLoading) {
      return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
  }

  if (!currentAgent) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center h-96">
            <h3 className="text-xl font-semibold tracking-tight">Agent Not Found</h3>
            <p className="text-muted-foreground mt-2">
                Could not load agent data. Please sign in again.
            </p>
        </div>
    )
  }

  const agentTier = currentAgent.tier;
  
  const availableResources = allResources.filter(resource => 
    currentAgent.hasAllTierAccess || resource.tier_access.includes(agentTier)
  );

  const generalResources = availableResources.filter(r => r.category === 'general');
  const webinarResources = availableResources.filter(r => r.category === 'webinar');

  const ResourceLink = ({ resource }: { resource: TrainingResource }) => {
    // Prefer external link, fall back to fileUrl. One must exist based on form validation.
    const href = resource.externalLink || resource.fileUrl || '#';
    
    return (
        <Link href={href} download={!resource.externalLink} target="_blank" rel="noopener noreferrer" className="group">
            <div className="flex items-center gap-4 py-3 border-b transition-colors group-hover:bg-muted/50 px-4 -mx-4 rounded-md">
                <BookMarked className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-lg font-medium text-foreground group-hover:text-primary transition-colors">{resource.title}</span>
            </div>
        </Link>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight uppercase text-primary">Training Materials</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl mx-auto">
          Need more information on our properties? Our Property Fast Facts contain all the information you will need such as: Location, Property Layouts, Fact Sheets, Image Gallery, Activity and Spa menus, and much more.
        </p>
      </div>

       {availableResources.length > 0 ? (
        <div className="grid gap-8 md:grid-cols-2">
            <Card>
                <CardContent className="pt-6">
                    {generalResources.length > 0 ? (
                        generalResources.map(resource => <ResourceLink key={resource.id} resource={resource} />)
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No general resources available for your tier.</p>
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Webinar Training</CardTitle>
                </CardHeader>
                <CardContent>
                     {webinarResources.length > 0 ? (
                        webinarResources.map(resource => <ResourceLink key={resource.id} resource={resource} />)
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No webinar recordings available for your tier.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      ) : (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center h-96">
            <h3 className="text-xl font-semibold tracking-tight">No Training Materials Available</h3>
            <p className="text-muted-foreground mt-2">
                There are currently no training materials available for your access tier.
            </p>
        </div>
      )}
    </div>
  );
}

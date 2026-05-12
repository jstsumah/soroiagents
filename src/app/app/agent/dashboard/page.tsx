
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getUser, isAgentProfileComplete, getProfileCompletion } from '@/services/user-service';
import { getProperties, getFeaturedProperty } from '@/services/property-service';
import { getResources } from '@/services/resource-service';
import { getDeals, getFeaturedDeal } from '@/services/deal-service';
import { getRates } from '@/services/rate-service';
import { getItineraries } from '@/services/itinerary-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Building, FileText, Gift, Star, AlertTriangle, Loader2, DollarSign, Package, UserCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { User, Property, Resource, ExclusiveDeal, Tier, Rate, PackagedItinerary, UserType, TierCommissions, NoticeBoardSettings } from '@/lib/types';
import { useAuth } from '@/app/app/app-provider';
import { TierBadge } from '@/components/ui/tier-badge';
import { NoticeBoardCard } from '@/components/notice-board-card';
import { getTierCommissions, getNoticeBoardSettings } from '@/services/settings-service';
import { PromotionCard } from '@/components/promotion-card';

type UnifiedResource = {
  id: string;
  title: string;
  type: 'rate' | 'deal' | 'itinerary' | 'resource';
  displayType: string;
  icon: React.ReactNode;
  uploaded_at: Date;
  url: string;
};


export default function AgentDashboardPage() {
  const { user: currentAgent, isLoading: authLoading } = useAuth();
  const [featuredProperty, setFeaturedProperty] = React.useState<Property | null>(null);
  const [latestResource, setLatestResource] = React.useState<UnifiedResource | null>(null);
  const [availableDeals, setAvailableDeals] = React.useState<ExclusiveDeal[]>([]);
  const [availablePropertiesCount, setAvailablePropertiesCount] = React.useState(0);
  const [tierCommissions, setTierCommissions] = React.useState<TierCommissions | null>(null);
  const [noticeSettings, setNoticeSettings] = React.useState<NoticeBoardSettings | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [profileIsComplete, setProfileIsComplete] = React.useState(true);
  const [completion, setCompletion] = React.useState<{score: number, missingFields: string[], isComplete: boolean} | null>(null);
  
  React.useEffect(() => {
    const fetchData = async () => {
        if (currentAgent) {
            try {
                const results = await Promise.allSettled([
                    getProperties(),
                    getResources(),
                    getDeals(),
                    getRates(),
                    getItineraries(),
                    getFeaturedProperty(),
                    isAgentProfileComplete(currentAgent.uid),
                    getTierCommissions(),
                    getNoticeBoardSettings(),
                    getProfileCompletion(currentAgent.uid),
                ]);

                const [
                    propsRes, resRes, dlsRes, rtsRes, itsRes, 
                    featPropRes, isCompleteRes, commissionsRes, noticeRes, completionRes
                ] = results;

                if (propsRes.status === 'fulfilled') setAvailablePropertiesCount(propsRes.value.length);
                else console.error("Failed to fetch properties:", propsRes.reason);

                if (featPropRes.status === 'fulfilled') setFeaturedProperty(featPropRes.value);
                else console.error("Failed to fetch featured property:", featPropRes.reason);

                if (isCompleteRes.status === 'fulfilled') setProfileIsComplete(isCompleteRes.value);
                else console.error("Failed to check profile completeness:", isCompleteRes.reason);

                if (commissionsRes.status === 'fulfilled') setTierCommissions(commissionsRes.value);
                else console.error("Failed to fetch commissions:", commissionsRes.reason);

                if (noticeRes.status === 'fulfilled') setNoticeSettings(noticeRes.value);
                else console.error("Failed to fetch notice settings:", noticeRes.reason);

                if (completionRes.status === 'fulfilled') setCompletion(completionRes.value);
                else console.error("Failed to fetch profile completion:", completionRes.reason);

                const res = resRes.status === 'fulfilled' ? resRes.value : [];
                const dls = dlsRes.status === 'fulfilled' ? dlsRes.value : [];
                const rts = rtsRes.status === 'fulfilled' ? rtsRes.value : [];
                const its = itsRes.status === 'fulfilled' ? itsRes.value : [];

                if (resRes.status === 'rejected') console.error("Failed to fetch resources:", resRes.reason);
                if (dlsRes.status === 'rejected') console.error("Failed to fetch deals:", dlsRes.reason);
                if (rtsRes.status === 'rejected') console.error("Failed to fetch rates:", rtsRes.reason);
                if (itsRes.status === 'rejected') console.error("Failed to fetch itineraries:", itsRes.reason);

                const filterByAccess = (item: { tier_access: Tier[], user_type_access?: UserType[] }) => {
                    const hasTierAccess = item.tier_access.includes(currentAgent.tier);
                    if (item.user_type_access) {
                        return hasTierAccess && item.user_type_access.includes(currentAgent.type);
                    }
                    return hasTierAccess;
                };
                
                const deals = dls.filter(filterByAccess);
                setAvailableDeals(deals);

                const unifiedResources: UnifiedResource[] = [
                    ...res.filter(filterByAccess).map(r => ({ id: r.id, title: r.title, type: 'resource' as const, displayType: r.category, icon: <FileText className="h-8 w-8 text-primary" />, uploaded_at: r.uploaded_at, url: r.file_url })),
                    ...rts.filter(filterByAccess).map(r => ({ id: r.id, title: r.title, type: 'rate' as const, displayType: 'Rate', icon: <DollarSign className="h-8 w-8 text-primary" />, uploaded_at: r.uploaded_at, url: r.fileUrl || '#' })),
                    ...deals.map(d => ({ id: d.id, title: d.title, type: 'deal' as const, displayType: 'Exclusive Deal', icon: <Gift className="h-8 w-8 text-primary" />, uploaded_at: d.uploaded_at, url: d.fileUrl })),
                    ...its.filter(filterByAccess).map(i => ({ id: i.id, title: i.title, type: 'itinerary' as const, displayType: 'Packaged Itinerary', icon: <Package className="h-8 w-8 text-primary" />, uploaded_at: i.uploaded_at, url: `/app/agent/resources/packaged-its#${i.id}` }))
                ];

                unifiedResources.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
                
                setLatestResource(unifiedResources[0] || null);

            } catch (error) {
                console.error("Failed to fetch agent data:", error);
            } finally {
                setIsLoading(false);
            }
        } else if (!authLoading) {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [currentAgent, authLoading]);
  
  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentAgent) {
    return <div>Agent not found.</div>;
  }

  const agentCommission = tierCommissions ? tierCommissions[currentAgent.tier] : null;

  const StatCard = ({ title, children, icon, description }: { title: string; children: React.ReactNode; icon: React.ReactNode; description?: string }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{children}</div>
        {description && <p className="text-base text-accent font-medium">{description}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-8">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {currentAgent.name.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">
          Here&apos;s a quick overview of your agent portal.
        </p>
      </div>

       {completion && !completion.isComplete && (
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-primary" />
                            Complete Your Profile
                        </CardTitle>
                        <CardDescription>
                            Your profile is {completion.score}% complete. Complete your profile to help you get better rates, higher commission tiers, and exclusive agent resources.
                        </CardDescription>
                    </div>
                    <Link href="/app/agent/profile">
                        <Button size="sm">
                            Complete Now <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Progress value={completion.score} className="h-2" />
                    <div className="flex flex-wrap gap-2">
                        <span className="text-xs font-medium text-muted-foreground mr-1">Missing:</span>
                        {completion.missingFields.slice(0, 5).map((field, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] bg-background">
                                {field}
                            </Badge>
                        ))}
                        {completion.missingFields.length > 5 && (
                            <span className="text-[10px] text-muted-foreground">+{completion.missingFields.length - 5} more</span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
      )}

       {currentAgent.status === 'pending' && (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Account Pending Approval</AlertTitle>
            <AlertDescription>
                Your account is currently awaiting approval from an administrator. You may have limited access to resources. Please complete your profile information to expedite the process.
            </AlertDescription>
        </Alert>
      )}

      <NoticeBoardCard settings={noticeSettings} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
            title="Your Tier" 
            icon={<Star className="h-4 w-4 text-muted-foreground" />}
            description={agentCommission !== null ? `Commission Level: ${agentCommission}%` : ''}
        >
            <TierBadge tier={currentAgent.tier} className="text-2xl px-4 py-1" />
        </StatCard>
        <StatCard title="Available Properties" icon={<Building className="h-4 w-4 text-muted-foreground" />}>
            {availablePropertiesCount.toString()}
        </StatCard>
        <StatCard title="Exclusive Deals" icon={<Gift className="h-4 w-4 text-muted-foreground" />}>
             {availableDeals.length.toString()}
        </StatCard>
      </div>
      
       <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
            <PromotionCard />
        </div>
         <div className="lg:col-span-2 flex flex-col gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Latest Resource</CardTitle>
                    <CardDescription>A new document has been added.</CardDescription>
                </CardHeader>
                <CardContent>
                    {latestResource ? (
                      <>
                        <div className="flex items-center gap-4">
                            {latestResource.icon}
                            <div>
                                <a href={latestResource.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
                                    <h4>{latestResource.title}</h4>
                                </a>
                                <Badge variant="secondary" className="capitalize mt-1">{latestResource.displayType}</Badge>
                            </div>
                        </div>
                         <Link href="/app/agent/resources">
                            <Button variant="secondary" className="w-full mt-4">
                                View All Resources
                            </Button>
                        </Link>
                      </>
                    ): <p>No new resources.</p>}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Featured Property</CardTitle>
                    {featuredProperty && <CardDescription>{featuredProperty.name} - {featuredProperty.location}</CardDescription>}
                </CardHeader>
                <CardContent>
                    {featuredProperty ? (
                    <>
                        <div className="relative aspect-video mb-4">
                            <Image
                                src={featuredProperty.images[0]}
                                alt={featuredProperty.name}
                                layout="fill"
                                objectFit="cover"
                                className="rounded-lg"
                                referrerPolicy="no-referrer"
                                data-ai-hint="safari lodge"
                                unoptimized
                            />
                        </div>
                        <p className="text-muted-foreground mb-4 line-clamp-2">{featuredProperty.description}</p>
                        <Link href={`/app/agent/properties/${featuredProperty.id}`}>
                        <Button variant="outline">
                            View Property <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        </Link>
                    </>
                    ) : <p>No featured property available.</p>}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

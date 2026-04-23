
"use client";

import { getUsers } from '@/services/user-service';
import { getResources } from '@/services/resource-service';
import { getRates } from '@/services/rate-service';
import { getItineraries } from '@/services/itinerary-service';
import { getDeals } from '@/services/deal-service';
import { getParkFees } from '@/services/park-fee-service';
import { getLocations } from '@/services/how-to-get-there-service';
import { getTrainingResources } from '@/services/training-resource-service';
import { TIERS, CATEGORIES } from '@/lib/constants';
import { StatCard } from './stat-card';
import { Users, Folder, Gem, UserCheck, UserX, Wifi, BarChart, Loader2, Download } from 'lucide-react';
import type { Tier, Category, User, Resource, Rate, PackagedItinerary, ExclusiveDeal, ParkFee, HowToGetThereLocation, TrainingResource, NoticeBoardSettings } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AgentTierChart } from './agent-tier-chart';
import { ResourceCategoryChart } from './resource-category-chart';
import * as React from 'react';
import { OnlineUsersDialog } from './online-users-dialog';
import { NoticeBoardCard } from '@/components/notice-board-card';
import { PromotionCard } from '@/components/promotion-card';
import { getFeaturedProperty } from '@/services/property-service';
import type { Property } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { getNoticeBoardSettings } from '@/services/settings-service';
import { useAuth } from '../../app-provider';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [allUsers, setAllUsers] = React.useState<User[]>([]);
  const [allResources, setAllResources] = React.useState<Resource[]>([]);
  const [allRates, setAllRates] = React.useState<Rate[]>([]);
  const [allItineraries, setAllItineraries] = React.useState<PackagedItinerary[]>([]);
  const [allDeals, setAllDeals] = React.useState<ExclusiveDeal[]>([]);
  const [allParkFees, setAllParkFees] = React.useState<ParkFee[]>([]);
  const [allHowToGetThere, setAllHowToGetThere] = React.useState<HowToGetThereLocation[]>([]);
  const [allTraining, setAllTraining] = React.useState<TrainingResource[]>([]);
  const [featuredProperty, setFeaturedProperty] = React.useState<Property | null>(null);
  const [noticeSettings, setNoticeSettings] = React.useState<NoticeBoardSettings | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isOnlineUsersDialogOpen, setIsOnlineUsersDialogOpen] = React.useState(false);
  const [onlineAgentsList, setOnlineAgentsList] = React.useState<User[]>([]);
  const [currentDate, setCurrentDate] = React.useState(new Date());

  React.useEffect(() => {
    if (!isAuthLoading && user && user.role === 'Agent') {
      router.replace('/app/agent/dashboard');
      return;
    }
  }, [user?.role, isAuthLoading, router]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
            getUsers(), 
            getResources(),
            getRates(),
            getItineraries(),
            getDeals(),
            getParkFees(),
            getLocations(),
            getTrainingResources(),
            getFeaturedProperty(),
            getNoticeBoardSettings(),
        ]);

        const [
          usersRes, resourcesRes, ratesRes, itinerariesRes, dealsRes, 
          parkFeesRes, howToGetThereRes, trainingRes, featPropRes, noticeRes
        ] = results;

        if (usersRes.status === 'fulfilled') setAllUsers(usersRes.value);
        else console.error("Failed to fetch users:", usersRes.reason);

        if (resourcesRes.status === 'fulfilled') setAllResources(resourcesRes.value);
        else console.error("Failed to fetch resources:", resourcesRes.reason);

        if (ratesRes.status === 'fulfilled') setAllRates(ratesRes.value);
        else console.error("Failed to fetch rates:", ratesRes.reason);

        if (itinerariesRes.status === 'fulfilled') setAllItineraries(itinerariesRes.value);
        else console.error("Failed to fetch itineraries:", itinerariesRes.reason);

        if (dealsRes.status === 'fulfilled') setAllDeals(dealsRes.value);
        else console.error("Failed to fetch deals:", dealsRes.reason);

        if (parkFeesRes.status === 'fulfilled') setAllParkFees(parkFeesRes.value);
        else console.error("Failed to fetch park fees:", parkFeesRes.reason);

        if (howToGetThereRes.status === 'fulfilled') setAllHowToGetThere(howToGetThereRes.value);
        else console.error("Failed to fetch locations:", howToGetThereRes.reason);

        if (trainingRes.status === 'fulfilled') setAllTraining(trainingRes.value);
        else console.error("Failed to fetch training:", trainingRes.reason);

        if (featPropRes.status === 'fulfilled') setFeaturedProperty(featPropRes.value);
        else console.error("Failed to fetch featured property:", featPropRes.reason);

        if (noticeRes.status === 'fulfilled') setNoticeSettings(noticeRes.value);
        else console.error("Failed to fetch notice settings:", noticeRes.reason);

        setCurrentDate(new Date());
      } catch (error) {
        console.error("Critical error in dashboard fetchData:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData(); // Initial fetch

    const intervalId = setInterval(fetchData, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []); 

  const agents = React.useMemo(() => (allUsers || []).filter(u => u.role === 'Agent'), [allUsers]);

  React.useEffect(() => {
      const fiveMinutesAgo = new Date(currentDate.getTime() - 5 * 60 * 1000);
      setOnlineAgentsList((agents || []).filter(u => u.last_seen && new Date(u.last_seen) > fiveMinutesAgo));
  }, [agents, currentDate]);
  
  const userCountByTier = TIERS.reduce((acc, tier) => {
    acc[tier] = (agents || []).filter(u => u.tier === tier).length;
    return acc;
  }, {} as Record<Tier, number>);

  const topTier = React.useMemo(() => {
    return Object.entries(userCountByTier).reduce((a, b) => a[1] > b[1] ? a : b, ['N/A', 0])[0] as Tier | 'N/A';
  }, [userCountByTier]);


  if (isLoading || isAuthLoading || !user || user.role === 'Agent') {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  const resourceCountByCategory = CATEGORIES.reduce((acc, category) => {
    switch (category) {
      case 'rates':
        acc[category] = allRates.length;
        break;
      case 'itineraries':
        const singleItinerariesCount = (allResources || []).filter(r => r.category === 'itineraries').length;
        acc[category] = (allItineraries || []).length + singleItinerariesCount;
        break;
      case 'deals':
        acc[category] = (allDeals || []).length;
        break;
      case 'park-fees':
        acc[category] = (allParkFees || []).length;
        break;
      case 'how-to-get-there':
        acc[category] = (allHowToGetThere || []).length;
        break;
      case 'training':
        acc[category] = (allTraining || []).length;
        break;
      case 'brochures':
      case 'images':
      case 'factsheet':
      case 'videos':
      case 'activity-sheets':
      case 'spa-menu':
        acc[category] = (allResources || []).filter(r => r.category === category).length;
        break;
      default:
        acc[category] = 0;
        break;
    }
    return acc;
  }, {} as Record<Category, number>);
  

  const totalAgents = (agents || []).length;
  const totalResources = Object.values(resourceCountByCategory).reduce((sum, count) => sum + count, 0);
  const activeAgents = (agents || []).filter(u => u.status === 'active').length;
  const pendingAgents = (agents || []).filter(u => u.status === 'pending').length;
  
  const onlineAgentsCount = onlineAgentsList.length;
  const topTierCount = topTier !== 'N/A' ? userCountByTier[topTier] : 0;


  return (
    <div className="flex flex-col gap-8">
       <OnlineUsersDialog 
            isOpen={isOnlineUsersDialogOpen} 
            onOpenChange={setIsOnlineUsersDialogOpen}
            onlineUsers={onlineAgentsList} 
        />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            An overview of your agent portal.
          </p>
        </div>
        {user.role === 'Super Admin' && (
            <a href="/DOCUMENTATION.md" download="System-Documentation.md">
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download Documentation
                </Button>
            </a>
        )}
      </div>
      <NoticeBoardCard settings={noticeSettings} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          title="Total Agents"
          value={totalAgents.toString()}
          icon={<Users className="h-[18px] w-[18px] text-muted-foreground" />}
          description="Total number of registered agents."
        />
        <StatCard
          title="Active Agents"
          value={activeAgents.toString()}
          icon={<UserCheck className="h-[18px] w-[18px] text-muted-foreground" />}
          description={`${totalAgents > 0 ? ((activeAgents / totalAgents) * 100).toFixed(0) : 0}% of total agents.`}
        />
        <StatCard
          title="Pending Activations"
          value={pendingAgents.toString()}
          icon={<UserX className="h-[18px] w-[18px] text-muted-foreground" />}
          description="Agents awaiting activation."
        />
        <button onClick={() => onlineAgentsCount > 0 && setIsOnlineUsersDialogOpen(true)} className="text-left">
            <StatCard
            title="Online Now"
            value={onlineAgentsCount.toString()}
            icon={<Wifi className="h-[18px] w-[18px] text-muted-foreground" />}
            description="Agents currently active."
            />
        </button>
         <StatCard
          title="Top Tier"
          value={topTier}
          icon={<Gem className="h-[18px] w-[18px] text-muted-foreground" />}
          description={`${topTierCount} agents currently in top tier.`}
        />
         <StatCard
          title="Total Resources"
          value={totalResources.toString()}
          icon={<Folder className="h-[18px] w-[18px] text-muted-foreground" />}
          description="Total number of available resources."
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                    <Link href={`/app/admin/properties/${featuredProperty.id}`}>
                    <Button variant="outline">
                        View Property <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    </Link>
                </>
                ) : <p>No featured property available.</p>}
            </CardContent>
        </Card>
        <PromotionCard />
      </div>
      <div className="grid gap-8 lg:grid-cols-5">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Agent Tier Distribution</CardTitle>
                <CardDescription>A visual breakdown of agent tiers.</CardDescription>
            </CardHeader>
            <CardContent>
                <AgentTierChart data={userCountByTier} />
            </CardContent>
        </Card>
         <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Resource Categories</CardTitle>
                <CardDescription>The number of resources per category.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResourceCategoryChart data={resourceCountByCategory} />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

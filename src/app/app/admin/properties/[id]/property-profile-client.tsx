

"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, BedDouble, MapPin, Wind, Sun, Utensils, Award, ArrowLeft, ExternalLink } from 'lucide-react';
import type { Property } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import * as React from 'react';

export function PropertyProfileClient({ property }: { property: Property}) {
  const router = useRouter();

  const SectionTitle = ({ children, icon }: { children: React.ReactNode, icon: React.ReactNode }) => (
    <div className="flex items-center gap-3 mb-4">
        {icon}
        <h3 className="text-xl font-semibold tracking-tight">{children}</h3>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
       <div className="flex items-center justify-between">
         <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{property.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-[18px] w-[18px]" />
                <p>{property.location}</p>
            </div>
         </div>
        <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-[18px] w-[18px]" />
            Back
        </Button>
      </div>
       <Card>
        <CardHeader className="p-0 border-b">
             <Carousel className="w-full">
                <CarouselContent>
                    {property.images.map((img, index) => (
                    <CarouselItem key={index}>
                        <div className="relative aspect-video">
                        <Image
                            src={img}
                            alt={`${property.name} - View ${index + 1}`}
                            fill
                            objectFit="cover"
                            className="rounded-t-lg"
                            referrerPolicy="no-referrer"
                            data-ai-hint="safari lodge interior"
                            unoptimized
                        />
                        </div>
                    </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
            </Carousel>
        </CardHeader>
        <CardContent className="p-6">
             <p className="text-lg text-muted-foreground">{property.description}</p>
        </CardContent>
      </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
                <CardHeader>
                    <SectionTitle icon={<BedDouble className="h-6 w-6 text-primary" />}>Rooms</SectionTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        <div className="font-semibold text-lg">{property.total_rooms} Total Rooms</div>
                        <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                           {property.room_types.map(rt => (
                               <li key={rt.name}>{rt.count} x {rt.name}</li>
                           ))}
                        </ul>
                    </div>
                    {property.wetuIbrochureUrl && (
                        <>
                            <Separator />
                            <Button asChild className="w-full">
                                <a href={property.wetuIbrochureUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="mr-2 h-[18px] w-[18px]" />
                                    More Property Info
                                </a>
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
            <Card>
                 <CardHeader>
                    <SectionTitle icon={<Award className="h-6 w-6 text-primary" />}>Facilities</SectionTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                        {property.facilities.map(item => <li key={item}>{item}</li>)}
                    </ul>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader>
                   <SectionTitle icon={<CheckCircle2 className="h-6 w-6 text-primary" />}>Amenities</SectionTitle>
                </CardHeader>
                <CardContent>
                     <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                        {property.amenities.map(item => <li key={item}>{item}</li>)}
                    </ul>
                </CardContent>
            </Card>
        </div>
        
        <Card>
            <CardHeader>
                <SectionTitle icon={<Sun className="h-6 w-6 text-primary" />}>Activities</SectionTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2">
                    {property.activities.map(item => <Badge key={item} variant="secondary">{item}</Badge>)}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}


export const PropertyProfileSkeleton = () => (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <div>
                <Skeleton className="h-9 w-72 mb-2" />
                <Skeleton className="h-5 w-48" />
            </div>
            <Skeleton className="h-10 w-44" />
        </div>
        <Card>
            <Skeleton className="aspect-video w-full rounded-t-lg" />
            <CardContent className="p-6">
                <Skeleton className="h-5 w-full mb-2" />
                <Skeleton className="h-5 w-3/4" />
            </CardContent>
        </Card>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-24 w-full" />
    </div>
);

    
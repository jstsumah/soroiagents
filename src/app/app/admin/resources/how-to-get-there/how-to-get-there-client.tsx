
"use client";

import * as React from "react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { HowToGetThereLocation } from "@/lib/types";
import { ArrowRight, Train, Car, Plane } from 'lucide-react';

interface HowToGetThereClientProps {
  data: HowToGetThereLocation[];
  flightRoutesImageUrl?: string;
}

const SectionTitle = ({ icon, children }: { icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="flex items-center gap-3 mb-4">
        {icon}
        <h3 className="text-xl font-semibold tracking-tight">{children}</h3>
    </div>
);

export function HowToGetThereClient({ data, flightRoutesImageUrl }: HowToGetThereClientProps) {
  return (
    <Tabs defaultValue={data[0]?.id || ''} className="w-full">
      <TabsList className="flex flex-wrap h-auto w-full justify-center">
        {data.map((location) => (
          <TabsTrigger key={location.id} value={location.id} className="mx-1 my-1">{location.name}</TabsTrigger>
        ))}
      </TabsList>
      {data.map((location) => (
        <TabsContent key={location.id} value={location.id} className="mt-6">
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="relative aspect-video mb-6 rounded-lg overflow-hidden border">
                <Image
                  src={location.mapUrl}
                  alt={`Map of ${location.name}`}
                  layout="fill"
                  objectFit="cover"
                  referrerPolicy="no-referrer"
                  unoptimized
                  data-ai-hint={`kenya map ${location.name}`}
                />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                 <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 flex items-center gap-3">
                    <div className="w-16 h-1 bg-white rounded-full"></div>
                    <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight text-shadow-lg">{location.name}</h2>
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <div className="flex flex-col gap-4">
                    <SectionTitle icon={<Plane className="h-6 w-6 text-primary" />} >By Flights</SectionTitle>
                    {flightRoutesImageUrl && (
                        <div className="relative aspect-video rounded-lg overflow-hidden border mb-6">
                            <Image
                                src={flightRoutesImageUrl}
                                alt="Flight Routes Map"
                                layout="fill"
                                objectFit="contain"
                                referrerPolicy="no-referrer"
                                unoptimized
                                data-ai-hint="kenya flight map"
                            />
                        </div>
                    )}
                    {location.flights.length > 0 && (
                        <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-primary hover:bg-primary/90">
                                    <TableHead className="text-primary-foreground font-bold">Departing from <ArrowRight className="inline-block h-4 w-4"/> Arriving to</TableHead>
                                    <TableHead className="text-primary-foreground font-bold">Ol Kiombo</TableHead>
                                    <TableHead className="text-primary-foreground font-bold">Samburu/Larsens</TableHead>
                                    <TableHead className="text-primary-foreground font-bold">Amboseli</TableHead>
                                    <TableHead className="text-primary-foreground font-bold">Taita Hills</TableHead>
                                    <TableHead className="text-primary-foreground font-bold">Ukunda</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {location.flights.map((flight, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{flight.departingFrom} <ArrowRight className="inline-block h-4 w-4"/> {flight.arrivingTo}</TableCell>
                                    <TableCell>{flight.location1}</TableCell>
                                    <TableCell>{flight.location2}</TableCell>
                                    <TableCell>{flight.location3}</TableCell>
                                    <TableCell>{flight.location4}</TableCell>
                                    <TableCell>{flight.location5}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                        </div>
                    )}
                </div>
                 
                <div className="flex flex-col gap-8">
                    {location.trains.length > 0 && (
                        <div>
                             <SectionTitle icon={<Train className="h-6 w-6 text-primary" />} >By Train</SectionTitle>
                             <p className="text-muted-foreground mb-4">Lumo Connections by Rail to/from Voi Station</p>
                             <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-primary hover:bg-primary/90">
                                            <TableHead className="text-primary-foreground font-bold">Routing or Vice Versa</TableHead>
                                            <TableHead className="text-primary-foreground font-bold">County</TableHead>
                                            <TableHead className="text-primary-foreground font-bold">Express</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {location.trains.map((train, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{train.routing}</TableCell>
                                            <TableCell>{train.county}</TableCell>
                                            <TableCell>{train.express}</TableCell>
                                        </TableRow>
                                    ))}
                                    </TableBody>
                                </Table>
                             </div>
                        </div>
                    )}
                    {location.roads.length > 0 && (
                         <div>
                            <SectionTitle icon={<Car className="h-6 w-6 text-primary" />} >By Road</SectionTitle>
                             <p className="text-muted-foreground mb-4">In Land Cruiser 4x4</p>
                              <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-primary hover:bg-primary/90">
                                            <TableHead className="text-primary-foreground font-bold">Routing or Vice Versa</TableHead>
                                            <TableHead className="text-primary-foreground font-bold">Estimated Driving Time</TableHead>
                                            <TableHead className="text-primary-foreground font-bold">Cost per Vehicle per way - Rack</TableHead>
                                            <TableHead className="text-primary-foreground font-bold">Net</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {location.roads.map((road, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{road.routing}</TableCell>
                                            <TableCell>{road.drivingTime}</TableCell>
                                            <TableCell>{road.cost}</TableCell>
                                            <TableCell className="font-bold text-primary">{road.net}</TableCell>
                                        </TableRow>
                                    ))}
                                    </TableBody>
                                </Table>
                             </div>
                        </div>
                    )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}

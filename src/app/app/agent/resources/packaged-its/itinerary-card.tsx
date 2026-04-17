

"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { PawPrint, Star } from "lucide-react";
import type { PackagedItinerary, TravelLink } from "@/lib/types";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';


interface ItineraryCardProps {
  itinerary: PackagedItinerary;
}

export function ItineraryCard({ itinerary }: ItineraryCardProps) {
    const renderLinkCell = (link: TravelLink) => {
        const url = link.value;
        const isValidLink = url && url.toUpperCase() !== 'N/A' && url.trim() !== '';
        
        return (
            <TableCell className="text-center">
                {isValidLink ? (
                    <Button variant="link" className="p-0 h-auto" asChild>
                        <a href={url} target="_blank" rel="noopener noreferrer" download={link.type === 'file'}>View</a>
                    </Button>
                ) : (
                    <span className="text-muted-foreground">N/A</span>
                )}
            </TableCell>
        );
    };

    return (
        <Card className={cn("overflow-hidden", itinerary.featured && "border-primary border-2")}>
            <CardHeader className="bg-primary text-primary-foreground p-6 relative">
                 {itinerary.featured && (
                    <div className="absolute top-4 left-4 text-primary-foreground">
                        <Star className="h-4 w-4" />
                    </div>
                 )}
                <CardTitle className="text-xl">{itinerary.title}</CardTitle>
                <CardDescription className="text-primary-foreground/90">{itinerary.commissionInfo}</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-6">
                    <PawPrint className="h-6 w-6 text-muted-foreground mt-1 shrink-0" />
                    <div>
                        <h3 className="text-lg font-semibold">{itinerary.description}</h3>
                        <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{itinerary.notes}</ReactMarkdown>
                        </div>
                    </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="font-bold text-foreground">Package</TableHead>
                                <TableHead className="text-center font-bold text-foreground">Drive-In</TableHead>
                                <TableHead className="text-center font-bold text-foreground">Fly-In</TableHead>
                                <TableHead className="text-center font-bold text-foreground">Rail Safari</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {itinerary.packages.map((pkg) => (
                                <TableRow key={pkg.name}>
                                    <TableCell className="font-medium">{pkg.name}</TableCell>
                                    {renderLinkCell(pkg.driveIn)}
                                    {renderLinkCell(pkg.flyIn)}
                                    {renderLinkCell(pkg.railSafari)}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

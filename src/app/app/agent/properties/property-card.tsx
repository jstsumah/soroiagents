

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import type { Property } from "@/lib/types";
import ReactMarkdown from 'react-markdown';

export function PropertyCard({ property }: { property: Property }) {
  return (
    <Card className="flex flex-col h-full overflow-hidden transition-shadow duration-300 hover:shadow-lg">
      <CardHeader className="p-0">
        <div className="relative aspect-video">
          <Image
            src={property.images[0]}
            alt={property.name}
            layout="fill"
            objectFit="cover"
            referrerPolicy="no-referrer"
            data-ai-hint="safari hotel exterior"
            unoptimized
          />
           <Badge variant="default" className="absolute top-3 right-3">{property.type}</Badge>
        </div>
        <div className="p-6 pb-2">
          <CardTitle className="text-xl leading-snug">{property.name}</CardTitle>
           <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
             <MapPin className="h-[18px] w-[18px]" />
             <span>{property.location}</span>
           </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow px-6 pt-0 pb-4">
        <div className="line-clamp-3 text-base prose prose-sm max-w-none text-muted-foreground">
            <ReactMarkdown>{property.description}</ReactMarkdown>
        </div>
      </CardContent>
      <CardFooter className="px-6 pb-6 pt-0">
         <Link href={`/app/agent/properties/${property.id}`} className="w-full">
            <Button variant="outline" className="w-full">
                View Details
            </Button>
         </Link>
      </CardFooter>
    </Card>
  );
}

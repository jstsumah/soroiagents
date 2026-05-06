

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Map, ImageIcon, FileQuestion, Video, Activity } from "lucide-react";
import type { Resource } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';

const categoryIcons = {
  rates: <FileText className="h-full w-full" />,
  itineraries: <Map className="h-full w-full" />,
  brochures: <FileQuestion className="h-full w-full" />,
  images: <ImageIcon className="h-full w-full" />,
  factsheet: <FileText className="h-full w-full" />,
  videos: <Video className="h-full w-full" />,
  'activity-sheets': <Activity className="h-full w-full" />,
  // Add other categories as needed
  deals: <FileText className="h-full w-full" />,
  'park-fees': <FileText className="h-full w-full" />,
  'how-to-get-there': <FileText className="h-full w-full" />,
  training: <FileText className="h-full w-full" />,
};

export function ResourceCard({ resource }: { resource: Resource }) {
  const icon = categoryIcons[resource.category];

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-shadow duration-300 hover:shadow-lg">
      <CardHeader className="p-0">
        <div className="relative aspect-video bg-muted/40">
           {resource.imageUrl ? (
              <Image 
                src={resource.imageUrl}
                alt={resource.title}
                fill
                objectFit="cover"
                data-ai-hint="safari landscape"
                unoptimized
              />
           ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground/50 p-8">
              {icon}
            </div>
           )}
        </div>
        <div className="p-6 pb-2">
            <Badge variant="accent" className="mb-2 capitalize shadow-sm">{resource.category === 'factsheet' ? 'Fact Sheet' : resource.category.replace('-', ' ')}</Badge>
            <CardTitle className="text-lg leading-snug">{resource.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow px-6 pt-0 pb-4">
        <div className="line-clamp-3 text-base prose prose-sm max-w-none text-muted-foreground">
            <ReactMarkdown>{resource.description}</ReactMarkdown>
        </div>
      </CardContent>
      <CardFooter className="px-6 pb-6 pt-0">
        <Button asChild className="w-full">
          <a href={resource.file_url} download target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-[18px] w-[18px]" />
            Download
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}

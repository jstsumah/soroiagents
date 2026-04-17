

"use client";

import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Calendar } from "lucide-react";
import type { ExclusiveDeal } from "@/lib/types";
import { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';

export function AgentDealCard({ deal }: { deal: ExclusiveDeal }) {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    if (deal.valid_until) {
      setFormattedDate(new Date(deal.valid_until).toLocaleDateString());
    }
  }, [deal.valid_until]);

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-shadow duration-300 hover:shadow-lg border-2 border-card">
      <CardHeader className="p-0">
        <div className="relative aspect-[16/10]">
          <Image
            src={deal.imageUrl}
            alt={deal.title}
            fill
            objectFit="cover"
            className="border-b"
            referrerPolicy="no-referrer"
            data-ai-hint="safari jeep"
            unoptimized
          />
        </div>
      </CardHeader>
      <CardContent className="p-6 flex-grow flex flex-col">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mb-2">
            <Calendar className="h-4 w-4" />
            <span>Valid until: {formattedDate}</span>
        </div>
        <h2 className="text-xl font-semibold tracking-tight mb-2">{deal.title}</h2>
        <a
          href={deal.fileUrl}
          download
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary font-semibold hover:underline text-lg"
        >
          Click to Download
        </a>
        <div className="text-muted-foreground text-base mt-4 flex-grow prose prose-sm max-w-none">
            <ReactMarkdown>{deal.description}</ReactMarkdown>
        </div>
         <div className="mt-6 border-l-4 border-primary pl-4 py-2">
            <p className="font-semibold text-foreground">Terms and Conditions Apply.</p>
        </div>
      </CardContent>
      <CardFooter className="px-6 pb-6 pt-4 bg-muted/50">
        <a href={deal.fileUrl} download className="w-full" target="_blank" rel="noopener noreferrer">
            <Button className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download
            </Button>
        </a>
      </CardFooter>
    </Card>
  );
}

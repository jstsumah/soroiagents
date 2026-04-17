
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Info, ImageIcon } from "lucide-react";
import type { Rate } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from 'react-markdown';

export function AgentRateCard({ rate }: { rate: Rate }) {
  const isRackRate = rate.title.toLowerCase().includes('rack');

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-shadow duration-300 hover:shadow-lg border-2 border-card">
      <CardHeader className="p-0">
        <div className="relative aspect-[16/10] bg-muted/30">
          {rate.imageUrl ? (
            <Image
              src={rate.imageUrl}
              alt={rate.title}
              layout="fill"
              objectFit="cover"
              className="border-b"
              referrerPolicy="no-referrer"
              data-ai-hint="lioness resting"
              unoptimized
            />
          ) : (
             <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="h-16 w-16 text-muted-foreground/50" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 flex-grow flex flex-col">
        <h2 className="text-xl font-semibold tracking-tight mb-2">{rate.title}</h2>
        {rate.fileUrl && (
          <a
            href={rate.fileUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent font-semibold hover:underline text-lg"
          >
            Click to Download
          </a>
        )}
        <div className="text-muted-foreground text-base mt-4 flex-grow prose prose-sm max-w-none">
            <ReactMarkdown>{rate.description}</ReactMarkdown>
        </div>
        {rate.isNett && !isRackRate && (
          <div className="mt-6 border-l-4 border-primary pl-4 py-2">
            <p className="font-semibold text-foreground">All rates are Nett and Non-Commissionable</p>
          </div>
        )}
      </CardContent>
      {rate.fileUrl && (
        <CardFooter className="px-6 pb-6 pt-4 bg-muted/50">
          <a href={rate.fileUrl} download className="w-full" target="_blank" rel="noopener noreferrer">
              <Button className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
              </Button>
          </a>
        </CardFooter>
      )}
    </Card>
  );
}

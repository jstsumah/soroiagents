
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPromotionCardSettings } from '@/services/settings-service';
import type { PromotionCardSettings } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from './ui/button';
import { ArrowRight, Download } from 'lucide-react';

export function PromotionCard() {
    const [settings, setSettings] = React.useState<PromotionCardSettings | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    
    React.useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            const promoSettings = await getPromotionCardSettings();
            setSettings(promoSettings);
            setIsLoading(false);
        }
        fetchSettings();
    }, []);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (!settings || !settings.title) {
        return null;
    }
    
    const content = (
        <>
            {settings.imageUrl && (
                <div className="relative aspect-video mb-4">
                    <Image
                        src={settings.imageUrl}
                        alt={settings.title}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-lg"
                        referrerPolicy="no-referrer"
                        unoptimized
                    />
                </div>
            )}
            {settings.description && (
                <p className="text-muted-foreground mb-4 line-clamp-3">{settings.description}</p>
            )}
             {settings.link && (
                 <Button variant="outline">
                    {settings.linkType === 'file' ? 'Download' : 'Learn More'}
                    {settings.linkType === 'file' ? <Download className="ml-2 h-4 w-4" /> : <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
             )}
        </>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>{settings.title}</CardTitle>
            </CardHeader>
            <CardContent>
                {settings.link ? (
                    <a href={settings.link} target="_blank" rel="noopener noreferrer" download={settings.linkType === 'file'}>
                       {content}
                    </a>
                ) : (
                    content
                )}
            </CardContent>
        </Card>
    );
}

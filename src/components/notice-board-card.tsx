
"use client";

import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Megaphone } from "lucide-react";
import type { NoticeBoardSettings } from "@/lib/types";

interface NoticeBoardCardProps {
    settings: NoticeBoardSettings | null;
}

export function NoticeBoardCard({ settings }: NoticeBoardCardProps) {
    if (!settings || !settings.message) {
        return null; // Don't render anything if there's no message
    }

    return (
        <Alert variant="accent">
            <Megaphone className="h-4 w-4" style={{ color: 'white' }} />
            <AlertTitle>{settings.title || 'Important Notice'}</AlertTitle>
            <AlertDescription>
                {settings.message}
            </AlertDescription>
        </Alert>
    )
}

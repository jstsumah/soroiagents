"use client";

import * as React from 'react';
import { getPopupBannerSettings } from '@/services/settings-service';
import type { PopupBannerSettings } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { settingsEmitter } from './settings-emitter';

const POPUP_STORAGE_KEY = 'popupBannerDismissed';

export function PopupBanner() {
  const supabase = createClient();
  const [authUser, setAuthUser] = React.useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = React.useState(true);
  const [settings, setSettings] = React.useState<PopupBannerSettings | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchSettings = React.useCallback(async () => {
    const bannerSettings = await getPopupBannerSettings();
    setSettings(bannerSettings);
  }, []);
  
  React.useEffect(() => {
    fetchSettings();

    supabase.auth.getSession().then(({ data: { session } }) => {
        setAuthUser(session?.user ?? null);
        setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setAuthUser(session?.user ?? null);
        setIsAuthLoading(false);
    });

    const unsubscribeFromSettings = settingsEmitter.subscribe(fetchSettings);

    return () => {
      subscription.unsubscribe();
      unsubscribeFromSettings();
    };
  }, [fetchSettings, supabase.auth]);

  const handleClose = React.useCallback(() => {
    if (!settings) return;

    setIsVisible(false);
    
    if (settings.displayFrequency !== 'always') {
        const dismissalData = {
          timestamp: new Date().getTime(),
          frequency: settings.displayFrequency,
        };
        
        localStorage.setItem(`${POPUP_STORAGE_KEY}_${settings.title}`, JSON.stringify(dismissalData));
        sessionStorage.setItem(`${POPUP_STORAGE_KEY}_session_${settings.title}`, 'true');
    }
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, [settings]);

  React.useEffect(() => {
    if (isAuthLoading || !settings || !settings.enabled) {
      setIsVisible(false);
      return;
    }
    
    if (settings.displayFrequency === 'always') {
        const showTimer = setTimeout(() => setIsVisible(true), 1000);
        return () => clearTimeout(showTimer);
    }

    const dismissedData = localStorage.getItem(`${POPUP_STORAGE_KEY}_${settings.title}`);
    let hasBeenDismissed = false;

    if (dismissedData) {
      const { timestamp, frequency } = JSON.parse(dismissedData);
      const now = new Date().getTime();

      if (frequency === 'once') {
        hasBeenDismissed = true;
      } else if (frequency === 'day') {
        const oneDay = 24 * 60 * 60 * 1000;
        if (now - timestamp < oneDay) {
          hasBeenDismissed = true;
        }
      } else if (frequency === 'every_x_days' && settings.displayFrequencyDays) {
          const xDays = settings.displayFrequencyDays * 24 * 60 * 60 * 1000;
          if (now - timestamp < xDays) {
              hasBeenDismissed = true;
          }
      }
    }
    
    if (sessionStorage.getItem(`${POPUP_STORAGE_KEY}_session_${settings.title}`)) {
      if (settings.displayFrequency === 'session') {
        hasBeenDismissed = true;
      }
    }
    
    if (hasBeenDismissed) {
      setIsVisible(false);
      return;
    }

    const shouldShowForAuthStatus = 
      settings.visibility === 'everyone' ||
      (settings.visibility === 'logged-in' && !!authUser) ||
      (settings.visibility === 'logged-out' && !authUser);
      
    if (shouldShowForAuthStatus) {
      const showTimer = setTimeout(() => {
        setIsVisible(true);
      }, 1000); 

      if (settings.duration > 0) {
        timerRef.current = setTimeout(() => {
          handleClose();
        }, (settings.duration * 1000) + 1000);
      }

      return () => {
        clearTimeout(showTimer);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    } else {
      setIsVisible(false);
    }

  }, [settings, authUser, isAuthLoading, handleClose]);

  if (!settings || !settings.enabled || !isVisible) {
    return null;
  }

  const positionClasses = {
    'bottom-left': "items-end justify-start",
    'bottom-right': "items-end justify-end",
    'center-left': "items-center justify-start",
    'center-right': "items-center justify-end",
  }[settings.position];

  return (
    <div 
        className={cn(
            "fixed inset-0 z-50 flex p-4 transition-opacity duration-300",
            positionClasses,
            isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
    >
        <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
        ></div>
        <div className={cn(
            "relative z-10 w-full max-w-sm transition-all duration-500",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}>
            <Card className="shadow-2xl overflow-hidden">
                <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 text-white hover:bg-black/60 z-20"
                onClick={handleClose}
                >
                <X className="h-4 w-4" />
                <span className="sr-only">Close banner</span>
                </Button>
                {settings.imageUrl && (
                <div className="relative aspect-video">
                    <Image src={settings.imageUrl} alt={settings.title} layout="fill" objectFit="cover" referrerPolicy="no-referrer" unoptimized />
                </div>
                )}
                <CardContent className="p-4 text-center">
                    <h4 className="font-bold text-lg">{settings.title}</h4>
                    <div className="text-sm text-muted-foreground mt-1 mb-4 space-y-2">
                        {settings.description.split('\n').map((line, index) => (
                            <p key={index}>{line}</p>
                        ))}
                    </div>
                    {settings.buttonText && settings.buttonLink && (
                        <Button asChild className="w-full">
                        <a href={settings.buttonLink} target="_blank" rel="noopener noreferrer" onClick={handleClose}>
                            {settings.buttonText}
                        </a>
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}

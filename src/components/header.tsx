

"use client";

import Link from 'next/link';
import * as React from 'react';
import { Button } from "@/components/ui/button";
import { GanttChartSquare, MessageSquare } from "lucide-react";
import { UserNav } from '@/components/user-nav';
import type { User, CompanyDetails, ChatSession } from '@/lib/types';
import { SidebarTrigger } from './ui/sidebar';
import { ThemeSwitcher } from './theme-switcher';
import { getCompanyDetails } from '@/services/settings-service';
import { getPendingChatCount } from '@/services/chat-service';
import { cn } from '@/lib/utils';

export function Header({ user }: { user: User }) {
  const [companyDetails, setCompanyDetails] = React.useState<CompanyDetails>({});
  const [pendingChatCount, setPendingChatCount] = React.useState(0);
  const isAdmin = user.role === 'Admin' || user.role === 'Super Admin';

  React.useEffect(() => {
    const fetchDetails = async () => {
        const details = await getCompanyDetails();
        setCompanyDetails(details);
    };
    fetchDetails();
  }, []);

  React.useEffect(() => {
    if (!isAdmin) return;

    const fetchCount = async () => {
        try {
            const count = await getPendingChatCount();
            setPendingChatCount(count);
        } catch (error) {
            console.error("Failed to fetch pending chats for header:", error);
        }
    };
    
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);

  }, [isAdmin]);
  
  const appName = companyDetails?.companyName || 'Tiered Access Hub';

  return (
    <header className="sticky top-0 z-40 flex w-full items-center gap-4 border-b bg-card p-5">
      <SidebarTrigger className="md:hidden" />
      
      <div className="flex items-center gap-2">
         <Link
            href={isAdmin ? '/app/admin/dashboard' : '/app/agent/dashboard'}
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <GanttChartSquare className="h-5 w-5 transition-all group-hover:scale-110" />
            <span className="sr-only">{appName}</span>
        </Link>
        <span className="hidden font-semibold md:block">{appName}</span>
      </div>
      
      <div className="relative ml-auto flex items-center gap-2 md:grow-0">
        {isAdmin && (
             <Button asChild variant="ghost" size="icon" className="relative group">
                <Link href="/app/admin/support-chat">
                    <MessageSquare className={cn("group-hover:text-primary-foreground", pendingChatCount > 0 && "text-destructive")} />
                    {pendingChatCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                            {pendingChatCount}
                        </span>
                    )}
                    <span className="sr-only">Support Chat</span>
                </Link>
            </Button>
        )}
        <ThemeSwitcher />
      </div>
      <UserNav user={user} />
    </header>
  );
}

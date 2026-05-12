

"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger } from "@/components/ui/sidebar";
import { Home, Users, Folder, Settings, DollarSign, Tag, Package, Car, Info, Building, BookOpen, LayoutDashboard, CalendarCheck, FileDown, Phone, MessageSquare, History, CreditCard, ChevronDown, PanelLeftClose, PanelLeftOpen, AlertTriangle } from "lucide-react";
import type { User } from '@/lib/types';
import * as React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { getProfileCompletion } from '@/services/user-service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from 'next/navigation';

const resourceSubNav = [
    { href: '/rates', icon: DollarSign, label: 'Rates' },
    { href: '/exclusive-deals', icon: Tag, label: 'Exclusive Deals' },
    { href: '/packaged-its', icon: Package, label: 'Soroi Packages' },
    { href: '/park-fees', icon: DollarSign, label: 'Park Fees' },
    { href: '/how-to-get-there', icon: Car, label: 'How To Get There' },
    { href: '/training', icon: BookOpen, label: 'Training Materials' },
    { href: 'https://soroicollection.resrequest.com/page/public/availabilitycalendar', icon: CalendarCheck, label: 'Availability Chart', external: true },
    { href: '/contacts', icon: Phone, label: 'Contacts' },
    { href: '/downloads', icon: FileDown, label: 'Downloads' },
];

const agentResourceSubNav = [
    { href: '/rates', icon: DollarSign, label: 'Rates' },
    { href: '/exclusive-deals', icon: Tag, label: 'Exclusive Deals' },
    { href: '/packaged-its', icon: Package, label: 'Soroi Packages' },
    { href: '/park-fees', icon: DollarSign, label: 'Park Fees' },
    { href: '/how-to-get-there', icon: Car, label: 'How To Get There' },
    { href: '/training', icon: BookOpen, label: 'Training Materials' },
    { href: 'https://soroicollection.resrequest.com/page/public/availabilitycalendar', icon: CalendarCheck, label: 'Availability Chart', external: true },
    { href: '/contacts', icon: Phone, label: 'Contacts' },
    { href: '', icon: FileDown, label: 'Downloads' }, // Corrected href for agent downloads
];


const adminNavItems = (user: User) => [
    { href: '/app/admin/dashboard', icon: Home, label: 'Dashboard', visible: true },
    { href: '/app/admin/users', icon: Users, label: 'Users', visible: user.role === 'Admin' || user.role === 'Super Admin' || user.canViewUsers },
    { href: '/app/admin/companies', icon: Building, label: 'Companies', visible: true },
    { href: '/app/admin/support-chat', icon: MessageSquare, label: 'Support Chat', visible: true },
    { href: '/app/admin/properties', icon: Building, label: 'Properties', visible: true },
    { 
      id: 'resources',
      icon: Folder, 
      label: 'Resources',
      visible: true,
      subItems: resourceSubNav.map(item => ({...item, href: item.external ? item.href : `/app/admin/resources${item.href}`}))
    },
    { href: '/app/admin/billing', icon: CreditCard, label: 'Billing', visible: user.role === 'Super Admin' },
    { href: '/app/admin/audit-trail', icon: History, label: 'Audit Trail', visible: user.role === 'Super Admin' },
    { href: '/app/admin/settings', icon: Settings, label: 'Settings', visible: true },
];


const agentNavItems = (user: User) => [
    { href: '/app/agent/dashboard', icon: LayoutDashboard, label: 'Dashboard', visible: true },
    { href: '/app/admin/users', icon: Users, label: 'Users', visible: user.canViewUsers },
    { href: '/app/agent/properties', icon: Building, label: 'Properties', visible: true },
    { 
      id: 'resources',
      icon: Folder, 
      label: 'Resources',
      visible: true,
      subItems: agentResourceSubNav.map(item => ({...item, href: item.external ? item.href : `/app/agent/resources${item.href}`}))
    },
];


export function AppSidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const isAdmin = user.role === 'Admin' || user.role === 'Super Admin';
  const currentUserNav = isAdmin ? adminNavItems(user) : agentNavItems(user);
  const { state, open, setOpen } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const router = useRouter();
  
  const [completion, setCompletion] = React.useState<{score: number, missingFields: string[], isComplete: boolean} | null>(null);
  const [showGate, setShowGate] = React.useState(false);
  const [pendingUrl, setPendingUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user && user.role === 'Agent') {
      getProfileCompletion(user.uid).then(setCompletion);
    }
  }, [user]);

  const handleResourceClick = (e: React.MouseEvent, href: string) => {
    if (user.role === 'Agent' && completion && !completion.isComplete) {
      e.preventDefault();
      setPendingUrl(href);
      setShowGate(true);
    }
  };

  return (
    <>
      <SidebarContent>
        <SidebarMenu className="flex-1 p-4 gap-1">
          {currentUserNav?.filter(item => item.visible).map((item) => {
             if (item.subItems) {
                const isResourceSectionActive = pathname.includes(item.id);
                const isDefaultOpen = !isAdmin && item.id === 'resources' ? true : isResourceSectionActive;
                return (
                    <Collapsible key={item.id} defaultOpen={isDefaultOpen}>
                        <CollapsibleTrigger asChild>
                             <Link 
                                href={item.subItems[0].href}
                                onClick={(e) => item.id === 'resources' && handleResourceClick(e, item.subItems![0].href)}
                             >
                                <SidebarMenuButton 
                                    isActive={isResourceSectionActive}
                                    tooltip={item.label}
                                    className="justify-start text-base w-full group"
                                >
                                    <item.icon className="h-[18px] w-[18px]" />
                                    <span className="truncate group-data-[collapsible=icon]:hidden flex-1 text-left">{item.label}</span>
                                    <ChevronDown className="h-4 w-4 ml-auto shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 group-data-[collapsible=icon]:hidden" />
                                </SidebarMenuButton>
                             </Link>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <ul className={cn("mx-3.5 my-1 flex min-w-0 translate-x-px flex-col gap-2 border-l border-sidebar-border px-2.5 py-2 group-data-[collapsible=icon]:hidden")}>
                                {item.subItems.map(subItem => {
                                     const isActive = pathname === subItem.href;
                                     const linkContent = (
                                        <SidebarMenuButton
                                            variant="ghost"
                                            size="default"
                                            isActive={isActive && !subItem.external}
                                            className={cn("w-full justify-start text-base")}
                                        >
                                            <span>{subItem.label}</span>
                                        </SidebarMenuButton>
                                      );
                                     return (
                                        <li key={subItem.href}>
                                            {subItem.external ? (
                                                <a href={subItem.href} target="_blank" rel="noopener noreferrer follow">
                                                    {linkContent}
                                                </a>
                                            ) : (
                                                <Link 
                                                    href={subItem.href}
                                                    onClick={(e) => handleResourceClick(e, subItem.href)}
                                                >
                                                    {linkContent}
                                                </Link>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                        </CollapsibleContent>
                    </Collapsible>
                )
             }
             return (
                <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                    asChild
                    isActive={pathname.startsWith(item.href!)}
                    tooltip={item.label}
                    className="justify-start text-base"
                    >
                    <Link href={item.href!}>
                        <item.icon className="h-[18px] w-[18px]" />
                        <span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
             )
          })}
        </SidebarMenu>
      </SidebarContent>
      
       <SidebarFooter className="p-4 flex-col gap-2">
            <SidebarMenuButton
              variant="ghost"
              onClick={() => setOpen(!open)}
              className="w-full justify-start text-base"
              tooltip={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
              <span className="truncate group-data-[collapsible=icon]:hidden">{isCollapsed ? 'Expand' : 'Collapse'}</span>
            </SidebarMenuButton>
        </SidebarFooter>

        <AlertDialog open={showGate} onOpenChange={setShowGate}>
            <AlertDialogContent className="max-w-[400px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        Complete Your Profile
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        A complete profile helps you get better rates, higher commission tiers, and exclusive offers tailored to your agency. 
                        Your current progress is <strong>{completion?.score}%</strong>.
                        <div className="mt-4 p-3 bg-muted rounded-md text-xs">
                            <span className="font-semibold block mb-1">Missing details:</span>
                            <ul className="list-disc pl-4 space-y-1">
                                {completion?.missingFields.map((field, i) => (
                                    <li key={i}>{field}</li>
                                ))}
                            </ul>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    {user.last_seen && (
                        <AlertDialogCancel 
                            onClick={() => {
                                setShowGate(false);
                                if (pendingUrl) router.push(pendingUrl);
                            }}
                        >
                            Not Now, Proceed
                        </AlertDialogCancel>
                    )}
                    <AlertDialogAction 
                        onClick={() => {
                            setShowGate(false);
                            router.push('/app/agent/profile');
                        }}
                    >
                        {user.last_seen ? 'Update Profile First' : 'Complete Profile to Access'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

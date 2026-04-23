
"use client";

import { useRouter, usePathname } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { SupportChatbot } from '@/components/support-chatbot';
import { Sidebar } from '@/components/ui/sidebar';
import type { User } from '@/lib/types';
import * as React from 'react';
import { getUser } from '@/services/user-service';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserHeartbeat } from '@/hooks/use-user-heartbeat';
import { ForcePasswordChangeDialog } from '@/components/force-password-change-dialog';
import { PopupBanner } from '@/components/popup-banner';

function UserActivityManager({ user }: { user: User }) {
  useUserHeartbeat(user.uid);
  return null;
}

const AppSkeleton = () => (
    <div className="flex flex-1 w-full flex-col bg-muted/30 overflow-hidden">
        <header className="sticky top-0 z-40 flex w-full items-center gap-4 border-b bg-card p-5">
            <Skeleton className="h-7 w-7 md:hidden" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="hidden h-6 w-32 md:block" />
            <div className="ml-auto flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
        </header>
        <div className="flex flex-1 overflow-hidden min-h-0">
            <div className="hidden w-16 flex-col border-r bg-card p-2 md:flex">
                <div className="flex flex-col gap-2">
                   {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-10" />)}
                </div>
            </div>
            <main className="flex flex-1 flex-col overflow-y-auto min-h-0">
                <div className="flex-grow p-8 sm:p-12">
                   <Skeleton className="h-96 w-full" />
                </div>
                <footer className="shrink-0 border-t bg-card px-8 py-4 text-center">
                    <Skeleton className="h-5 w-1/2 mx-auto" />
                </footer>
            </main>
        </div>
    </div>
);


const AuthContext = React.createContext<{ 
    user: User | null; 
    isLoading: boolean;
    actualUser: User | null;
    isImpersonating: boolean;
    stopImpersonating: () => void;
}>({ 
    user: null, 
    isLoading: true,
    actualUser: null,
    isImpersonating: false,
    stopImpersonating: () => {}
});

export function useAuth() {
    const context = React.useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<User | null>(null);
    const [actualUser, setActualUser] = React.useState<User | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isImpersonating, setIsImpersonating] = React.useState(false);
    const userRef = React.useRef<User | null>(user);
    
    React.useEffect(() => {
        userRef.current = user;
    }, [user]);
    
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    const stopImpersonating = React.useCallback(() => {
        setIsImpersonating(false);
        setUser(actualUser);
        // Remove the impersonate param from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('impersonate');
        window.history.replaceState({}, '', url.pathname + url.search);
    }, [actualUser]);

    React.useEffect(() => {
        let isMounted = true;

        const fetchProfile = async (uid: string, retryCount = 0) => {
            if (!isMounted) return;
            
            // Only show loading skeleton if we don't have a user yet
            if (!userRef.current) {
                setIsLoading(true);
            }

            try {
                const userProfile = await getUser(uid);
                if (isMounted) {
                    if (userProfile) {
                        setActualUser(userProfile);
                        
                        // Check for impersonation
                        const urlParams = new URLSearchParams(window.location.search);
                        const impersonateUid = urlParams.get('impersonate');
                        
                        if (impersonateUid && (userProfile.role === 'Admin' || userProfile.role === 'Super Admin')) {
                            const targetProfile = await getUser(impersonateUid);
                            if (targetProfile) {
                                setUser(targetProfile);
                                setIsImpersonating(true);
                            } else {
                                setUser(userProfile);
                            }
                        } else {
                            setUser(userProfile);
                        }
                    } else if (retryCount < 2) {
                        // Retry once or twice if profile not found (rare race condition)
                        setTimeout(() => fetchProfile(uid, retryCount + 1), 1000);
                        return; // Don't set isLoading to false yet
                    } else {
                        setUser(null);
                        setActualUser(null);
                    }
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
                if (isMounted) {
                    setUser(null);
                    setActualUser(null);
                    setIsLoading(false);
                }
            }
        };

        // Listen for changes - this handles the initial session as well
        if (!supabase) {
            setIsLoading(false);
            return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                // If we already have a user and it's the same ID, we can fetch in background
                // without showing the global loading skeleton again.
                fetchProfile(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setActualUser(null);
                setIsLoading(false);
            } else if (event === 'INITIAL_SESSION' && !session) {
                setIsLoading(false);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    const contextValue = React.useMemo(() => ({ 
        user, 
        isLoading, 
        actualUser, 
        isImpersonating, 
        stopImpersonating 
    }), [user, isLoading, actualUser, isImpersonating, stopImpersonating]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}


export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
      <AuthProvider>
          <AppContent>
              {children}
          </AppContent>
      </AuthProvider>
  )
}

function AppContent({children}: {children: React.ReactNode}) {
    const { user, isLoading, isImpersonating, stopImpersonating } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    
    React.useEffect(() => {
        if (!isLoading) {
            if (!user && !pathname.startsWith('/signup') && !pathname.startsWith('/forgot-password') && pathname !== '/') {
                router.push('/');
            } else if (user && (pathname === '/' || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password'))) {
                router.push('/app');
            }
        }
    }, [user, isLoading, router, pathname, isImpersonating]);

    if (isLoading || (!user && !pathname.startsWith('/signup') && !pathname.startsWith('/forgot-password') && pathname !== '/')) {
        return <AppSkeleton />;
    }
    
    if (!user) {
        // This case handles public pages like login, signup, etc.
        // It prevents the main app layout from rendering.
        // `children` here would be the content of those public pages.
        return <>{children}</>;
    }


    return (
        <div className="flex flex-1 w-full flex-col bg-muted/30 overflow-hidden">
            {isImpersonating && (
                <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between text-sm font-medium">
                    <div className="flex items-center gap-2">
                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs uppercase">Preview Mode</span>
                        <span>Viewing as <strong>{user.name}</strong> ({user.email})</span>
                    </div>
                    <button 
                        onClick={stopImpersonating}
                        className="underline hover:no-underline font-bold"
                    >
                        Exit Preview
                    </button>
                </div>
            )}
            <Header user={user} />
            <div className="flex flex-1 overflow-hidden min-h-0">
                <Sidebar>
                    <AppSidebar user={user} />
                </Sidebar>
                <div className="flex flex-1 flex-col overflow-hidden">
                    <main className="flex-1 overflow-y-auto min-h-0 bg-background relative z-0">
                        <div className="w-full p-8 sm:p-12 pb-24">
                            {children}
                        </div>
                    </main>
                    <div className="shrink-0 relative z-10 w-full bg-card">
                        <Footer />
                    </div>
                </div>
            </div>
            <SupportChatbot />
            <UserActivityManager user={user} />
            <ForcePasswordChangeDialog 
                isOpen={!!user.passwordResetRequired} 
                onPasswordChanged={() => router.refresh()} 
            />
        </div>
    );
}

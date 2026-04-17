"use client";

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUser } from '@/services/user-service';
import { Loader2 } from 'lucide-react';

// This component now acts as a safety net. If a user ever lands here,
// it will redirect them to the correct dashboard or login page.
export default function AppRootPage() {
    const router = useRouter();
    const supabase = createClient();

    React.useEffect(() => {
        if (!supabase) {
            router.replace('/');
            return;
        }
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
                try {
                    const userProfile = await getUser(session.user.id);
                    if (userProfile) {
                        if (userProfile.role === 'Admin' || userProfile.role === 'Super Admin') {
                            router.replace('/app/admin/dashboard');
                        } else {
                            router.replace('/app/agent/dashboard');
                        }
                    } else {
                        // User exists in Auth but not in profiles table, a rare but possible state.
                        // Give it a second and retry.
                        setTimeout(async () => {
                            const secondTryProfile = await getUser(session.user.id);
                             if (secondTryProfile) {
                                if (secondTryProfile.role === 'Admin' || secondTryProfile.role === 'Super Admin') {
                                    router.replace('/app/admin/dashboard');
                                } else {
                                    router.replace('/app/agent/dashboard');
                                }
                            } else {
                                console.error("User profile not found in Supabase after delay.");
                                router.replace('/'); 
                            }
                        }, 1500)
                    }
                } catch (error) {
                    console.error("Failed to fetch user profile for redirection:", error);
                    router.replace('/');
                }
            } else {
                // No user is logged in, send to login page.
                router.replace('/');
            }
        };

        checkUser();

        // No need for onAuthStateChange here as AppProvider handles it globally
    }, [router, supabase]);

    // Display a loading skeleton while the check is happening.
    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Redirecting...</p>
            </div>
        </div>
    );
}

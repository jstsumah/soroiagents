'use client';

import { createClient } from '@/lib/supabase/client';
import type { ChatSession, ChatMessage } from '@/lib/types';

const supabase = createClient();

/**
 * Set up a real-time listener for a chat session using Supabase Realtime.
 */
export function onChatSessionUpdate(sessionId: string, callback: (session: ChatSession | null) => void): () => void {
    // Helper to fetch the full session with messages
    const fetchSession = async () => {
        console.log("[fetchSession] Starting for sessionId:", sessionId);
        if (!sessionId) {
            console.warn("[fetchSession] No sessionId provided");
            return;
        }

        try {
            // 1. Fetch Session properties
            const { data: sessionData, error: sessionError } = await supabase
                .from('chat_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (sessionError) {
                console.error("Error fetching chat session properties:", sessionError);
                console.error("Error details - Code:", sessionError.code);
                console.error("Error details - Message:", sessionError.message);
                
                if (sessionError.code === 'PGRST116') {
                    console.warn("[fetchSession] Session not found (PGRST116)");
                    callback(null);
                }
                return;
            }

            if (!sessionData) {
                console.warn("[fetchSession] No data returned for session");
                return;
            }

            console.log("[fetchSession] Session properties fetched successfully");

            // 2. Fetch Messages separately
            const { data: messagesData, error: messagesError } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('timestamp', { ascending: true });

        if (messagesError) {
            console.error("Error fetching chat messages:", {
                code: messagesError.code,
                message: messagesError.message,
                details: messagesError.details
            });
            // Still return the session even if messages fail
        }

        const session: ChatSession = {
            ...sessionData,
            messages: messagesData || []
        };
        callback(session);
    } catch (err: any) {
        console.error("[fetchSession] Unexpected crash:", err);
    }
};

    // Subscribe to changes in the chat_messages table for this session
    const channel = supabase
        .channel(`chat-session-${sessionId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'chat_messages',
                filter: `session_id=eq.${sessionId}`
            },
            () => {
                fetchSession();
            }
        )
        // Also listen for changes to the session itself (e.g. metadata updates)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'chat_sessions',
                filter: `id=eq.${sessionId}`
            },
            () => {
                fetchSession();
            }
        )
        .subscribe();

    // Initial fetch
    fetchSession();

    return () => {
        supabase.removeChannel(channel);
    };
}

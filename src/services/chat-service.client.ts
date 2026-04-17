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
        const { data: sessionData, error: sessionError } = await supabase
            .from('chat_sessions')
            .select('*, chat_messages(*)')
            .eq('id', sessionId)
            .order('timestamp', { foreignTable: 'chat_messages', ascending: true })
            .single();

        if (sessionError) {
            if (sessionError.code === 'PGRST116') {
                callback(null);
            } else {
                console.error("Error fetching chat session:", sessionError);
            }
            return;
        }

        if (sessionData) {
            const session: ChatSession = {
                ...sessionData,
                messages: sessionData.chat_messages || []
            };
            callback(session);
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

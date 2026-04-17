'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { ChatSession, ChatMessage, User } from '@/lib/types';
import { getUser } from './user-service';

export async function createChatSession(userId: string): Promise<string> {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('chat_sessions')
        .insert({
            user_id: userId === 'guest' ? null : userId,
            status: 'open'
        })
        .select()
        .single();

    if (error) throw error;
    
    // Add initial bot message
    const initialMessage: ChatMessage = {
        role: 'model',
        content: "Hello! How can I assist you today? You can ask about our services or help with resources.",
        author: {
            name: "Support Bot",
            uid: "support-bot-uid"
        }
    };
    await addMessage(data.id, initialMessage);

    return data.id;
}

export async function listChatSessions(status?: 'open' | 'closed'): Promise<ChatSession[]> {
    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
        .from('chat_sessions')
        .select('*, chat_messages(*)');
    
    if (status) {
        query = query.eq('status', status);
    }

    const { data, error } = await query.order('last_message_at', { ascending: false }).limit(100);

    if (error) {
        console.error('Error listing chat sessions:', error);
        return [];
    }

    const sessions: ChatSession[] = await Promise.all(
        (data || []).map(async (session) => {
            const userProfile = session.user_id ? await getUser(session.user_id) : undefined;
            
            return {
                id: session.id,
                userId: session.user_id || 'guest',
                createdAt: new Date(session.created_at),
                lastMessageAt: new Date(session.last_message_at),
                status: session.status,
                messages: (session.chat_messages || []).map(mapDbToMessage),
                user: userProfile || undefined
            };
        })
    );

    return sessions;
}

export async function getPendingChatCount(): Promise<number> {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        // Fetch open sessions and only the MOST RECENT message for each
        const { data, error } = await supabaseAdmin
            .from('chat_sessions')
            .select(`
                id, 
                chat_messages(role, author_uid, timestamp)
            `)
            .eq('status', 'open')
            .order('timestamp', { foreignTable: 'chat_messages', ascending: false })
            .limit(1, { foreignTable: 'chat_messages' });

        if (error) {
            console.error("Supabase error in getPendingChatCount:", error);
            return 0;
        }

        let count = 0;
        for (const session of (data || [])) {
            const messages = session.chat_messages || [];
            if (messages.length === 0) {
                // An open session with no messages might be considered pending if we expect an initial bot msg
                // But normally createChatSession adds one.
                continue;
            }
            
            const lastMessage = messages[0]; // Already sorted descending
            
            // Check if last message was from user OR our support bot (means user hasn't been helped by human)
            // Note: DB stores null for bot UID
            const isBot = lastMessage.role === 'model' && (lastMessage.author_uid === null || lastMessage.author_uid === 'support-bot-uid');
            
            if (lastMessage.role === 'user' || isBot) {
                count++;
            }
        }
        return count;
    } catch (error) {
        console.error("Critical error in getPendingChatCount:", error);
        return 0;
    }
}

export async function addMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin();
    const { error: msgError } = await supabaseAdmin
        .from('chat_messages')
        .insert({
            session_id: sessionId,
            role: message.role,
            content: message.content,
            author_name: message.author?.name,
            author_uid: message.author?.uid === 'support-bot-uid' ? null : message.author?.uid
        });

    if (msgError) throw msgError;

    const { error: sessError } = await supabaseAdmin
        .from('chat_sessions')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', sessionId);

    if (sessError) throw sessError;
}

export async function getChatSession(sessionId: string): Promise<ChatSession | null> {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('chat_sessions')
        .select('*, chat_messages(*)')
        .eq('id', sessionId)
        .single();

    if (error || !data) return null;

    const userProfile = data.user_id ? await getUser(data.user_id) : null;

    return {
        id: data.id,
        userId: data.user_id || 'guest',
        createdAt: new Date(data.created_at),
        lastMessageAt: new Date(data.last_message_at),
        status: data.status,
        messages: (data.chat_messages || []).map(mapDbToMessage).sort((a, b) => a.timestamp!.getTime() - b.timestamp!.getTime()),
        user: userProfile || undefined
    };
}

export async function closeChatSession(sessionId: string): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin
        .from('chat_sessions')
        .update({ status: 'closed' })
        .eq('id', sessionId);
}

const mapDbToMessage = (db: any): ChatMessage => ({
    role: db.role,
    content: db.content,
    timestamp: new Date(db.timestamp),
    author: {
        name: db.author_name || (db.role === 'model' ? 'Support Bot' : 'User'),
        uid: db.author_uid || (db.role === 'model' ? 'support-bot-uid' : 'user-uid')
    }
});

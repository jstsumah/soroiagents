
"use client";

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Loader2, Send, LogOut, MessageSquare } from 'lucide-react';
import { useAuth } from '@/app/app/app-provider';
import type { ChatSession, ChatMessage } from '@/lib/types';
import { addMessage, closeChatSession } from '@/services/chat-service';
import { onChatSessionUpdate } from '@/services/chat-service.client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChatDrawerContentProps {
    sessionId: string;
    onClose?: () => void;
}

export function ChatDrawerContent({ sessionId, onClose }: ChatDrawerContentProps) {
    const { user: adminUser } = useAuth();
    const { toast } = useToast();
    const [session, setSession] = React.useState<ChatSession | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [newMessage, setNewMessage] = React.useState('');
    const [isSending, setIsSending] = React.useState(false);
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);
    
    React.useEffect(() => {
        if (!sessionId) return;

        setIsLoading(true);
        const unsubscribe = onChatSessionUpdate(sessionId, (sessionData) => {
            if (sessionData) {
                setSession(sessionData);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [sessionId]);

    React.useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [session?.messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !adminUser || !sessionId) return;

        setIsSending(true);
        const message: ChatMessage = {
            role: 'model',
            content: newMessage.trim(),
            author: {
                name: adminUser.name,
                uid: adminUser.uid,
            }
        };

        try {
            await addMessage(sessionId, message);
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message:", error);
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Failed to send message."
            });
        } finally {
            setIsSending(false);
        }
    };
    
    const handleCloseChat = async () => {
        if (!sessionId) return;
        try {
            await closeChatSession(sessionId);
            toast({
                title: "Chat Closed",
                description: "This chat session has been marked as closed."
            });
            if (onClose) onClose();
        } catch(e) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Could not close the chat session."
            })
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading conversation...</p>
            </div>
        );
    }
    
    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-6">
                <MessageSquare className="h-12 w-12 text-muted-foreground opacity-20" />
                <h3 className="font-semibold">Session not found</h3>
                <p className="text-sm text-muted-foreground">The requested chat session could not be loaded. It might have been deleted.</p>
            </div>
        );
    }

    const guestUser = session.messages.find(m => m.role === 'user')?.author;

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-primary/10">
                        <AvatarFallback className="bg-primary/5 text-primary">
                            {guestUser?.name?.substring(0, 2).toUpperCase() || 'GU'}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="font-bold leading-none">{guestUser?.name || 'Guest User'}</h2>
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-mono">ID: {sessionId.substring(0, 8)}...</p>
                    </div>
                </div>
                {session.status === 'open' && (
                    <Button variant="ghost" size="sm" onClick={handleCloseChat} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <LogOut className="h-4 w-4 mr-2" />
                        End Session
                    </Button>
                )}
            </div>

            <ScrollArea className="flex-grow bg-muted/5 p-4" ref={scrollAreaRef as any}>
                <div className="space-y-6">
                    {session.messages.map((message, index) => {
                        const isMe = message.author?.uid === adminUser?.uid;
                        const isSupportBot = message.author?.uid === 'support-bot-uid' || (!message.author?.uid && message.role === 'model');

                        return (
                            <div key={index} className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                                <div className={cn(
                                    "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm text-sm transition-all",
                                    isMe 
                                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                                        : isSupportBot 
                                            ? "bg-muted/80 text-muted-foreground rounded-tl-none italic"
                                            : "bg-white border rounded-tl-none text-foreground"
                                )}>
                                    {!isSupportBot && (
                                        <p className="text-[10px] uppercase font-bold tracking-tight mb-1 opacity-70">
                                            {isMe ? "You" : (message.author?.name || "Guest")}
                                        </p>
                                    )}
                                    <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                </div>
                                {message.timestamp && (
                                    <span className="text-[10px] text-muted-foreground px-1">
                                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                    {session.status === 'closed' && (
                        <div className="flex flex-col items-center gap-2 py-8">
                            <div className="h-px w-full bg-border" />
                            <span className="bg-background px-4 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold -mt-3.5">
                                Conversation Closed
                            </span>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="p-4 border-t bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                <div className="flex items-end gap-2 relative">
                    <Textarea 
                        placeholder={session.status === 'closed' ? "This session is closed" : "Type a reply..."} 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (!isSending && session.status === 'open') handleSendMessage();
                            }
                        }}
                        disabled={isSending || session.status === 'closed'}
                        className="min-h-[44px] max-h-[120px] resize-none pr-12 rounded-xl focus-visible:ring-primary/20 transition-all border-muted"
                    />
                    <Button 
                        size="icon"
                        onClick={handleSendMessage} 
                        disabled={isSending || !newMessage.trim() || session.status === 'closed'}
                        className="absolute right-2 bottom-1.5 h-8 w-8 rounded-lg"
                    >
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        <span className="sr-only">Send</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}

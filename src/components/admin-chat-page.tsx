
"use client";

import * as React from 'react';
import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Bot, Loader2, Send, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/app/app/app-provider';
import type { ChatSession, ChatMessage } from '@/lib/types';
import { addMessage } from '@/services/chat-service';
import { onChatSessionUpdate } from '@/services/chat-service.client';
import Link from 'next/link';

export default function AdminChatPage() {
    const { sessionId } = useParams();
    const { user: adminUser } = useAuth();
    const [session, setSession] = React.useState<ChatSession | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [newMessage, setNewMessage] = React.useState('');
    const [isSending, setIsSending] = React.useState(false);
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (typeof sessionId !== 'string') return;

        const unsubscribe = onChatSessionUpdate(sessionId, (sessionData) => {
            if (sessionData) {
                setSession(sessionData);
            } else {
                notFound();
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [sessionId]);

    React.useEffect(() => {
        // Auto-scroll to the bottom when new messages arrive
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [session?.messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !adminUser || typeof sessionId !== 'string') return;

        setIsSending(true);
        const message: ChatMessage = {
            role: 'model', // Admin acts as the 'model'
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
            // Optionally, show a toast notification for the error
        } finally {
            setIsSending(false);
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    if (!session) {
        return notFound();
    }
    
    const guestUser = session.messages.find(m => m.role === 'user')?.author;

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center gap-4">
                <Link href="/app/admin/support-chat">
                    <Button variant="outline" size="icon">
                        <ArrowLeft />
                    </Button>
                </Link>
                <div className="flex items-center gap-3">
                     <Avatar>
                        <AvatarFallback>{guestUser?.name?.substring(0, 2) || 'G'}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Chat with {guestUser?.name || 'Guest'}</h1>
                        <p className="text-sm text-muted-foreground">Session ID: {sessionId}</p>
                    </div>
                </div>
            </div>
             <Card className="flex flex-col flex-grow">
                <CardContent className="flex-1 p-0">
                    <ScrollArea className="h-[calc(100vh-20rem)]" ref={scrollAreaRef as any}>
                        <div className="p-6 space-y-4">
                           {session.messages.map((message, index) => (
                            <div key={index} className={`flex items-end gap-2 ${message.author?.uid === adminUser?.uid ? 'justify-end' : 'justify-start'}`}>
                                {message.author?.uid !== adminUser?.uid && (
                                     <Avatar className="h-8 w-8">
                                        <AvatarFallback>
                                             {message.role === 'user' ? (message.author?.name?.substring(0,1) || 'U') : <Bot className="h-5 w-5"/>}
                                        </AvatarFallback>
                                     </Avatar>
                                )}
                                <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${message.author?.uid === adminUser?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    <p className="font-bold mb-1">{message.author?.name || (message.role === 'model' ? 'Support Bot' : 'User')}</p>
                                    <p>{message.content}</p>
                                </div>
                                {message.author?.uid === adminUser?.uid && (
                                     <Avatar className="h-8 w-8">
                                         <AvatarImage src={`/avatars/0${(parseInt(adminUser.uid) % 5) + 1}.png`} alt={`@${adminUser.name}`} />
                                        <AvatarFallback>{adminUser.name.substring(0,2)}</AvatarFallback>
                                     </Avatar>
                                )}
                            </div>
                           ))}
                        </div>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="p-4 border-t">
                    <div className="flex w-full items-center gap-2">
                        <Textarea 
                            placeholder="Type your message to assist the user..." 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            disabled={isSending}
                            className="min-h-[40px] resize-none"
                        />
                        <Button onClick={handleSendMessage} disabled={isSending}>
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            <span className="sr-only">Send</span>
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

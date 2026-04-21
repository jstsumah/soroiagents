
"use client";

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User as UserIcon, MessageSquare, Building, Mail, Phone, Loader2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { getCompanyDetails } from '@/services/settings-service';
import type { CompanyDetails, ChatMessage, User } from '@/lib/types';
import { Separator } from './ui/separator';
import { supportChat } from '@/ai/flows/support-chat-flow';
import { useAuth } from '@/app/app/app-provider';
import { createChatSession, addMessage } from '@/services/chat-service';
import { onChatSessionUpdate } from '@/services/chat-service.client';
import { getUsers } from '@/services/user-service';
import { settingsEmitter } from './settings-emitter';


export function SupportChatbot() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({});
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isAdminOnline, setIsAdminOnline] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [n8nChatbotUrl, setN8nChatbotUrl] = useState<string | undefined>();

    const fetchCompanyDetails = React.useCallback(async () => {
        const details = await getCompanyDetails();
        setCompanyDetails(details);
        setN8nChatbotUrl(details.n8nChatbotUrl);
    }, []);

    useEffect(() => {
        if (isOpen) {
           fetchCompanyDetails();
        }
         const unsubscribe = settingsEmitter.subscribe(fetchCompanyDetails);
         return () => unsubscribe();
    }, [isOpen, fetchCompanyDetails]);


    useEffect(() => {
        if (!isOpen || n8nChatbotUrl) return;

        const checkAdminStatus = async () => {
            try {
                const allUsers = await getUsers();
                const now = new Date();
                const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
                const onlineAdmin = allUsers.find(u => 
                    (u.role === 'Admin' || u.role === 'Super Admin') && 
                    u.last_seen && 
                    new Date(u.last_seen) > fiveMinutesAgo
                );
                setIsAdminOnline(!!onlineAdmin);
            } catch (error) {
                console.error("Failed to check admin status:", error);
                setIsAdminOnline(false); // Default to offline on error
            }
        };

        checkAdminStatus();
        const intervalId = setInterval(checkAdminStatus, 30000); // Check every 30 seconds

        return () => clearInterval(intervalId);
    }, [isOpen, n8nChatbotUrl]);

    const INITIAL_GREETING: ChatMessage = {
        role: 'model',
        content: "Hello! How can I assist you today? You can ask about our services or help with resources.",
        author: {
            name: "Support Bot",
            uid: "support-bot-uid"
        }
    };

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([INITIAL_GREETING]);
        }
    }, [isOpen, messages.length]);

    useEffect(() => {
        if (!sessionId || !isOpen || n8nChatbotUrl) return;

        const unsubscribe = onChatSessionUpdate(sessionId, (sessionData) => {
            if (sessionData && sessionData.messages) {
                // Merge with initial greeting if needed, or just set if it contains it
                setMessages(sessionData.messages);
            }
        });

        return () => unsubscribe();
    }, [sessionId, isOpen, n8nChatbotUrl]);


    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);


    const handleSend = async () => {
        if (input.trim() === '' || isLoading || !user) return;

        const userMessageContent = input.trim();
        setInput('');
        setIsLoading(true);
        
        try {
            let currentSessionId = sessionId;
            
            // Create session on-demand if it doesn't exist
            if (!currentSessionId) {
                currentSessionId = await createChatSession(user.uid);
                setSessionId(currentSessionId);
            }

            await supportChat({
                sessionId: currentSessionId,
                message: userMessageContent,
            });

        } catch (error) {
            console.error("Chatbot error:", error);
            const errorMessage: ChatMessage = { role: 'model', content: "I'm sorry, but I'm having trouble connecting right now. Please try again later." };
            if (sessionId) {
                await addMessage(sessionId, errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="accent"
                    className="fixed z-50 bottom-8 right-8 h-auto py-2 px-4 rounded-full shadow-lg text-sm animate-pulse"
                    aria-label="Open support chat"
                >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Contact Support
                </Button>
            </PopoverTrigger>
            <PopoverContent
                side="top"
                align="end"
                className="w-80 rounded-lg shadow-xl border-none p-0 md:w-96"
                sideOffset={16}
            >
                {n8nChatbotUrl ? (
                    <div className="h-[60vh] bg-background rounded-lg overflow-hidden">
                        <iframe
                            src={n8nChatbotUrl}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            title="Support Chatbot"
                        ></iframe>
                    </div>
                ) : (
                    <div className="flex flex-col h-[60vh]">
                        <div className="flex items-center gap-4 p-4 bg-primary text-primary-foreground rounded-t-lg">
                            <Bot className="h-7 w-7" />
                            <div>
                                <h3 className="font-semibold text-lg">Support Chat</h3>
                                <div className="flex items-center gap-2 text-sm opacity-90">
                                    <div className={`h-2 w-2 rounded-full ${isAdminOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                                    <span>{isAdminOnline ? 'Admin is online' : 'Admin is offline'}</span>
                                </div>
                            </div>
                        </div>
                        <ScrollArea className="flex-1 bg-background" ref={scrollAreaRef as any}>
                            <div className="space-y-4 p-4">
                                {messages.map((message, index) => (
                                    <div key={index} className={`flex items-end gap-2 ${message.author?.uid === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                        {message.author?.uid !== user?.uid &&
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                                                <Bot className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        }
                                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${message.author?.uid === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                            <p className="font-bold mb-1">{message.author?.name || (message.role === 'model' ? 'Support Bot' : 'User')}</p>
                                            <p>{message.content}</p>
                                        </div>
                                        {message.author?.uid === user?.uid &&
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                                                <UserIcon className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        }
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex items-end gap-2 justify-start">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                                            <Bot className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-muted text-muted-foreground flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Thinking...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                        <div className="p-4 border-t bg-background">
                            <div className="flex items-center gap-2">
                                <Textarea
                                    placeholder="Type your message..."
                                    className="resize-none min-h-[40px]"
                                    rows={1}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    disabled={isLoading}
                                />
                                <Button size="icon" onClick={handleSend} aria-label="Send message" disabled={isLoading}>
                                    <Send />
                                </Button>
                            </div>
                        </div>
                        <Separator />
                        <div className="p-4 bg-muted/50 rounded-b-lg text-sm text-muted-foreground space-y-2">
                            <div className="flex items-center gap-3">
                                <Building className="h-4 w-4 shrink-0" />
                                <span className="font-semibold text-foreground">{companyDetails.companyName}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 shrink-0" />
                                <a href={`mailto:${companyDetails.contactEmail}`} className="hover:underline text-foreground">{companyDetails.contactEmail}</a>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 shrink-0" />
                                <span className="text-foreground">{companyDetails.contactPhone}</span>
                            </div>
                        </div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}

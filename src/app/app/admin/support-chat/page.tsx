
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, ArrowRight, UserX } from 'lucide-react';
import type { ChatSession } from '@/lib/types';
import { listChatSessions } from '@/services/chat-service';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../../app-provider';
import { useRouter } from 'next/navigation';

export default function AdminSupportChatDashboard() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const [openSessions, setOpenSessions] = React.useState<ChatSession[]>([]);
    const [closedSessions, setClosedSessions] = React.useState<ChatSession[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const { toast } = useToast();

    React.useEffect(() => {
        if (!isAuthLoading && user && user.role === 'Agent') {
          router.replace('/app/agent/dashboard');
          return;
        }
    }, [user, isAuthLoading, router]);

    const hasAdminReplied = (session: ChatSession): boolean => {
        return session.messages.some(msg => msg.role === 'model' && msg.author?.uid !== 'support-bot-uid');
    };
    
    const isUserInactive = (session: ChatSession): boolean => {
        if (!session.user?.last_seen) {
            return true; // If we've never seen the user, assume inactive.
        }
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        return new Date(session.user.last_seen) < tenMinutesAgo;
    };

    React.useEffect(() => {
        const fetchSessions = async () => {
            setIsLoading(true);
            try {
                const [open, closed] = await Promise.all([
                    listChatSessions('open'),
                    listChatSessions('closed'),
                ]);
                setOpenSessions(open);
                setClosedSessions(closed);
            } catch (error) {
                console.error("Failed to fetch chat sessions:", error);
                 toast({
                    variant: "destructive",
                    title: "Could not fetch chats",
                    description: "There was an error loading the support chat sessions.",
                });
            } finally {
                setIsLoading(false);
            }
        };

        if (!isAuthLoading && user && user.role !== 'Agent') {
            fetchSessions();
            const interval = setInterval(fetchSessions, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        }
    }, [toast, user, isAuthLoading]);

    const formatDate = (date: any) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString();
    }
    
    const ChatTable = ({ sessions }: { sessions: ChatSession[] }) => (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Last Message</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sessions.length > 0 ? (
                        sessions.map(session => {
                            const lastMessage = session.messages[session.messages.length - 1];
                            const isAdminInvolved = hasAdminReplied(session);

                            return (
                                <TableRow key={session.id} className={cn(!isAdminInvolved && session.status === 'open' && "bg-accent/50 hover:bg-accent/70")}>
                                    <TableCell>
                                        {!isAdminInvolved && session.status === 'open' ? (
                                            <Badge>New</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="capitalize">{session.status}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <span>{session.user?.name || 'Guest User'}</span>
                                        {isUserInactive(session) && <Badge variant="destructive"><UserX className="h-3 w-3 mr-1" />Inactive</Badge>}
                                    </TableCell>
                                    <TableCell>
                                        <p className="truncate max-w-sm">{lastMessage?.content || '...'}</p>
                                    </TableCell>
                                    <TableCell>{formatDate(session.lastMessageAt)}</TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/app/admin/support-chat/${session.id}`}>
                                            <Button variant="outline" size="sm">
                                                {session.status === 'open' ? "Join Chat" : "View Chat"} <ArrowRight className="ml-2 h-4 w-4"/>
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No chat sessions in this view.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );


    if (isLoading || isAuthLoading || !user || user.role === 'Agent') {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Support Chat</h1>
                <p className="text-muted-foreground">
                    View and manage ongoing user chat sessions. New requests are highlighted.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Active Chat Sessions</CardTitle>
                    <CardDescription>
                        Here are the most recent chat sessions from users.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Tabs defaultValue="open">
                        <TabsList>
                            <TabsTrigger value="open">Open Chats</TabsTrigger>
                            <TabsTrigger value="closed">Closed Chats</TabsTrigger>
                        </TabsList>
                        <TabsContent value="open" className="mt-4">
                            <ChatTable sessions={openSessions} />
                        </TabsContent>
                        <TabsContent value="closed" className="mt-4">
                            <ChatTable sessions={closedSessions} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

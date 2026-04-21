
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, ArrowRight, UserX, Clock, MessageCircle, MoreVertical } from 'lucide-react';
import type { ChatSession } from '@/lib/types';
import { listChatSessions } from '@/services/chat-service';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../../app-provider';
import { useRouter } from 'next/navigation';
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle, 
    SheetTrigger,
    SheetDescription 
} from '@/components/ui/sheet';
import { ChatDrawerContent } from './chat-drawer';

export default function AdminSupportChatDashboard() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const [openSessions, setOpenSessions] = React.useState<ChatSession[]>([]);
    const [closedSessions, setClosedSessions] = React.useState<ChatSession[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        if (!isAuthLoading && user && user.role === 'Agent') {
          router.replace('/app/agent/dashboard');
          return;
        }
    }, [user, isAuthLoading, router]);

    const hasAdminReplied = (session: ChatSession): boolean => {
        return session.messages.some(msg => msg.role === 'model' && msg.author?.uid !== 'support-bot-uid' && msg.author?.uid);
    };
    
    const isUserInactive = (session: ChatSession): boolean => {
        if (!session.user?.last_seen) return true;
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        return new Date(session.user.last_seen) < tenMinutesAgo;
    };

    const fetchSessions = async () => {
        try {
            const [open, closed] = await Promise.all([
                listChatSessions('open'),
                listChatSessions('closed'),
            ]);
            setOpenSessions(open);
            setClosedSessions(closed);
        } catch (error) {
            console.error("Failed to fetch chat sessions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        if (!isAuthLoading && user && user.role !== 'Agent') {
            fetchSessions();
            const interval = setInterval(fetchSessions, 30000);
            return () => clearInterval(interval);
        }
    }, [user, isAuthLoading]);

    const openChat = (sessionId: string) => {
        setSelectedSessionId(sessionId);
        setIsDrawerOpen(true);
    };

    const ChatTable = ({ sessions }: { sessions: ChatSession[] }) => (
        <div className="rounded-xl border border-muted/20 overflow-hidden bg-background/30 backdrop-blur-sm">
            <Table>
                <TableHeader className="bg-muted/20">
                    <TableRow>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="hidden md:table-cell">Last Message</TableHead>
                        <TableHead className="w-[180px]">Last Activity</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sessions.length > 0 ? (
                        sessions.map(session => {
                            const lastMessage = session.messages[session.messages.length - 1];
                            const isAdminInvolved = hasAdminReplied(session);
                            const isNew = !isAdminInvolved && session.status === 'open';

                            return (
                                <TableRow 
                                    key={session.id} 
                                    className={cn(
                                        "group cursor-pointer transition-colors duration-200", 
                                        isNew ? "bg-primary/[0.03] hover:bg-primary/[0.06]" : "hover:bg-muted/50"
                                    )}
                                    onClick={() => openChat(session.id)}
                                >
                                    <TableCell>
                                        {isNew ? (
                                            <Badge className="bg-primary text-primary-foreground border-none rounded-sm">New Task</Badge>
                                        ) : (
                                            <Badge variant="outline" className={cn(
                                                "capitalize font-medium rounded-sm",
                                                session.status === 'open' ? "text-green-600 border-green-200" : "text-muted-foreground"
                                            )}>
                                                {session.status}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold flex items-center gap-2">
                                                {session.user?.name || 'Guest User'}
                                                {isUserInactive(session) && session.status === 'open' && (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                                                )}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-mono uppercase opacity-50">
                                                ID: {session.id.substring(0,8)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <div className="flex items-center gap-2 max-w-sm">
                                            <span className="text-muted-foreground opacity-50">
                                                {lastMessage?.role === 'model' ? "You: " : "User: "}
                                            </span>
                                            <p className="truncate text-sm font-medium">
                                                {lastMessage?.content || '...'}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span className="text-xs font-medium">
                                                {new Date(session.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                <div className="flex flex-col items-center gap-2 opacity-50">
                                    <MessageCircle className="h-8 w-8" />
                                    <p>No chat sessions matching this filter</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );

    if (isLoading || isAuthLoading || !user || user.role === 'Agent') {
        return (
            <div className="flex flex-col h-full w-full items-center justify-center gap-4 bg-muted/10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="font-medium text-muted-foreground animate-pulse">Initializing Portal...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <MessageSquare className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-foreground">Support Center</h1>
                    </div>
                    <p className="text-muted-foreground max-w-2xl">
                        Monitor active consultations and assist users in real-time. Respond to enquiries and provide resource clarifications.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white/50 py-1.5 px-3 rounded-sm">
                        Active Conversations: {openSessions.length}
                    </Badge>
                </div>
            </div>

            <Card className="border-none shadow-xl shadow-primary/5 bg-background/40 backdrop-blur-md overflow-hidden">
                <CardHeader className="border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl">Conversation Registry</CardTitle>
                            <CardDescription>Select a session to join the live conversation</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                     <Tabs defaultValue="open" className="w-full">
                        <div className="flex items-center justify-between mb-6">
                            <TabsList className="bg-muted/50 p-1 h-auto">
                                <TabsTrigger value="open" className="px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    Active Inbox
                                    {openSessions.length > 0 && (
                                        <Badge variant="accent" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] rounded-sm">
                                            {openSessions.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="closed" className="px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    Archive
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        
                        <TabsContent value="open" className="mt-0 ring-offset-background focus-visible:outline-none">
                            <ChatTable sessions={openSessions} />
                        </TabsContent>
                        
                        <TabsContent value="closed" className="mt-0 ring-offset-background focus-visible:outline-none">
                            <ChatTable sessions={closedSessions} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <SheetContent side="right" className="p-0 sm:max-w-md md:max-w-lg lg:max-w-xl border-l shadow-2xl">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Chat Session</SheetTitle>
                        <SheetDescription>Conversing with user</SheetDescription>
                    </SheetHeader>
                    {selectedSessionId && (
                        <ChatDrawerContent 
                            sessionId={selectedSessionId} 
                            onClose={() => setIsDrawerOpen(false)}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

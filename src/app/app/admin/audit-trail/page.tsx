
"use client";

import * as React from 'react';
import { getAuditLogs } from '@/services/audit-log-service';
import type { AuditLog } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { AuditLogTable } from './audit-log-table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../../app-provider';
import { useRouter } from 'next/navigation';

export default function AuditTrailPage() {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isAuthLoading && user && user.role === 'Agent') {
      router.replace('/app/agent/dashboard');
      return;
    }

    // Role-based access control for non-Super Admins
    if (!isAuthLoading && user && user.role !== 'Super Admin') {
        router.replace('/app/admin/dashboard');
        return;
    }
    
    if (user) {
        const fetchLogs = async () => {
          setIsLoading(true);
          try {
            const fetchedLogs = await getAuditLogs();
            setLogs(fetchedLogs);
          } catch (error) {
            console.error("Failed to fetch audit logs:", error);
            toast({
              variant: "destructive",
              title: "Fetch Failed",
              description: "Could not load audit logs from the database.",
            });
          } finally {
            setIsLoading(false);
          }
        };

        fetchLogs();
    }
  }, [user, isAuthLoading, router, toast]);


  if (isLoading || isAuthLoading || !user || user.role !== 'Super Admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
        <p className="text-muted-foreground">
          Track important activities that occur within the application.
        </p>
      </div>
      <AuditLogTable logs={logs} />
    </div>
  );
}

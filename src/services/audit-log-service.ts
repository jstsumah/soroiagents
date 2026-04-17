'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { AuditLog } from '@/lib/types';

type LogActivityData = {
    userId: string;
    userName: string;
    action: string;
    details?: Record<string, any>;
    status?: 'success' | 'failure';
}

export const logActivity = async (data: LogActivityData) => {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { error } = await supabaseAdmin
            .from('audit_logs')
            .insert({
                user_id: data.userId === 'system' ? null : data.userId,
                user_name: data.userName,
                action: data.action,
                details: data.details || {},
                status: data.status || 'success',
                timestamp: new Date().toISOString()
            });
        
        if (error) throw error;
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
};

export const getAuditLogs = async (): Promise<AuditLog[]> => {
    const supabaseAdmin = getSupabaseAdmin();
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    
    while (true) {
        const { data, error } = await supabaseAdmin
            .from('audit_logs')
            .select('*')
            .range(from, from + step - 1)
            .order('timestamp', { ascending: false });
        
        if (error) {
            console.error('Error fetching audit logs:', error);
            break;
        }
        
        if (!data || data.length === 0) break;
        
        allData = [...allData, ...data];
        if (data.length < step) break;
        from += step;
    }

    return allData.map(log => ({
        id: log.id,
        userId: log.user_id || 'system',
        userName: log.user_name || 'System',
        action: log.action,
        timestamp: new Date(log.timestamp),
        details: log.details || {},
        status: log.status
    }));
};

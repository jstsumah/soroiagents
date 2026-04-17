'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from './auth-service';
import type { Payment } from '@/lib/types';

export const getPaymentHistory = async (): Promise<Payment[]> => {
    const caller = await getAuthenticatedUser();
    
    if (!caller) {
        throw new Error('Not authenticated');
    }

    if (caller.role !== 'Super Admin') {
        throw new Error('Unauthorized');
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching payment history:', error);
        throw error;
    }
    
    return (data || []).map(p => ({
        id: p.id,
        date: new Date(p.created_at),
        description: p.description,
        amount: p.amount,
        status: p.status,
        userId: p.user_id,
        transactionId: p.transaction_id
    }));
};

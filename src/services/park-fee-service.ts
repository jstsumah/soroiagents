'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { ParkFee } from '@/lib/types';
import { getAuthenticatedUser, ensureAdmin, isAdmin } from './auth-service';
import { logActivity } from './audit-log-service';

export const getParkFees = async (): Promise<ParkFee[]> => {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('park_fees')
        .select('*')
        .order('location');

    if (error) {
        console.error('Error fetching park fees:', error);
        return [];
    }
    let fees = (data || []) as ParkFee[];

    // If not admin, filter by user type
    const isUserAdmin = await isAdmin(user);
    if (!isUserAdmin) {
        fees = fees.filter(fee => 
            !fee.user_type || 
            fee.user_type === 'all' || 
            fee.user_type === user.type
        );
    }

    return fees;
};

export const getParkFee = async (id: string): Promise<ParkFee | null> => {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('park_fees')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error(`Error fetching park fee ${id}:`, error);
        throw error;
    }
    if (data) {
        const fee = data as ParkFee;
        // Authorization check for non-admins
        const isUserAdmin = await isAdmin(user);
        if (!isUserAdmin) {
            if (fee.user_type && fee.user_type !== 'all' && fee.user_type !== user.type) {
                return null;
            }
        }
        return fee;
    }
    return null;
};

export const addParkFee = async (data: Omit<ParkFee, 'id'>): Promise<string> => {
    const user = await ensureAdmin();
    const supabaseAdmin = getSupabaseAdmin();
    const { data: insertedData, error } = await supabaseAdmin
        .from('park_fees')
        .insert([data])
        .select()
        .single();

    if (error) {
        console.error('Error adding park fee:', error);
        throw error;
    }

    try {
        await logActivity({
            userId: user.uid,
            userName: user.name,
            action: 'parkFee.create',
            details: { parkFeeId: insertedData.id, location: data.location }
        });
    } catch (e) {
        console.error('Could not log park fee creation activity:', e);
    }

    return insertedData.id;
};

export const updateParkFee = async (id: string, data: Partial<ParkFee>): Promise<void> => {
    const user = await ensureAdmin();
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('park_fees')
        .update(data)
        .eq('id', id);

    if (error) {
        console.error(`Error updating park fee ${id}:`, error);
        throw error;
    }

    try {
        await logActivity({
            userId: user.uid,
            userName: user.name,
            action: 'parkFee.update',
            details: { parkFeeId: id, location: data.location || 'Unknown' }
        });
    } catch (e) {
        console.error('Could not log park fee update activity:', e);
    }
};

export const deleteParkFee = async (id: string): Promise<void> => {
    const user = await ensureAdmin();
    const feeData = await getParkFee(id);
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('park_fees')
        .delete()
        .eq('id', id);

    if (error) {
        console.error(`Error deleting park fee ${id}:`, error);
        throw error;
    }

    try {
        await logActivity({
            userId: user.uid,
            userName: user.name,
            action: 'parkFee.delete',
            details: { parkFeeId: id, location: feeData.location }
        });
    } catch (e) {
        console.error('Could not log park fee deletion activity:', e);
    }
};

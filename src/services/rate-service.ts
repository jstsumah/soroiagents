'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { Rate } from '@/lib/types';
import { getAuthenticatedUser, ensureAdmin, isAdmin } from './auth-service';
import { logActivity } from './audit-log-service';
import { deleteFile } from './storage-service';

export const getRates = async (): Promise<Rate[]> => {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('rates')
        .select('*')
        .order('uploaded_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching rates:', error);
        return [];
    }

    let rates = (data || []).map(mapDbToRate);

    // If not admin, filter by tier and user type access
    const isUserAdmin = await isAdmin(user);
    if (!isUserAdmin) {
        rates = rates.filter(rate => {
            const hasTierAccess = !rate.tier_access || 
                                 rate.tier_access.length === 0 || 
                                 rate.tier_access.includes(user.tier || 'Brass') ||
                                 user.hasAllTierAccess;
            
            const hasTypeAccess = !rate.user_type_access || 
                                 rate.user_type_access.length === 0 || 
                                 rate.user_type_access.includes(user.type || 'international');
            
            return hasTierAccess && hasTypeAccess;
        });
    }

    return rates;
};

export const getRate = async (id: string): Promise<Rate | null> => {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('rates')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error(`Error fetching rate ${id}:`, error);
        return null;
    }

    if (data) {
        const rate = mapDbToRate(data);
        // Authorization check for non-admins
        const isUserAdmin = await isAdmin(user);
        if (!isUserAdmin) {
            const hasTierAccess = !rate.tier_access || 
                                 rate.tier_access.length === 0 || 
                                 rate.tier_access.includes(user.tier || 'Brass') ||
                                 user.hasAllTierAccess;
            
            const hasTypeAccess = !rate.user_type_access || 
                                 rate.user_type_access.length === 0 || 
                                 rate.user_type_access.includes(user.type || 'international');
            
            if (!hasTierAccess || !hasTypeAccess) return null;
        }
        return rate;
    }
    return null;
};

export const addRate = async (data: Omit<Rate, 'id'>): Promise<string> => {
    const user = await ensureAdmin();
    const dbData = mapRateToDb(data);
    const supabaseAdmin = getSupabaseAdmin();
    const { data: insertedData, error } = await supabaseAdmin
        .from('rates')
        .insert(dbData)
        .select()
        .single();

    if (error) {
        console.error('Error adding rate:', error);
        throw error;
    }

    try {
        await logActivity({
            userId: user.uid,
            userName: user.name,
            action: 'rate.create',
            details: { rateId: insertedData.id, rateTitle: data.title }
        });
    } catch (e) {
        console.error('Could not log rate creation activity:', e);
    }

    return insertedData.id;
};

export const updateRate = async (id: string, data: Partial<Rate>): Promise<void> => {
    const user = await ensureAdmin();
    const dbData = mapRateToDb(data);
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('rates')
        .update(dbData)
        .eq('id', id);

    if (error) {
        console.error(`Error updating rate ${id}:`, error);
        throw error;
    }

    try {
        await logActivity({
            userId: user.uid,
            userName: user.name,
            action: 'rate.update',
            details: { rateId: id, rateTitle: data.title || 'Unknown' }
        });
    } catch (e) {
        console.error('Could not log rate update activity:', e);
    }
};

export const deleteRate = async (id: string): Promise<void> => {
    const user = await ensureAdmin();
    const rate = await getRate(id);
    if (!rate) return;

    // Delete files from storage
    if (rate.fileUrl) await deleteFile(rate.fileUrl);
    if (rate.imageUrl) await deleteFile(rate.imageUrl);

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('rates')
        .delete()
        .eq('id', id);

    if (error) throw error;

    try {
        await logActivity({
            userId: user.uid,
            userName: user.name,
            action: 'rate.delete',
            details: { rateId: id, rateTitle: rate.title }
        });
    } catch (e) {
        console.error('Could not log rate deletion activity:', e);
    }
};

const mapDbToRate = (db: any): Rate => ({
    id: db.id,
    title: db.title,
    description: db.description || '',
    tier_access: db.tier_access || [],
    user_type_access: db.user_type_access || [],
    fileUrl: db.file_url,
    imageUrl: db.image_url,
    isNett: db.is_nett,
    uploaded_at: new Date(db.uploaded_at)
});

const mapRateToDb = (rate: Partial<Rate>): any => {
    const db: any = {};
    if (rate.title !== undefined) db.title = rate.title;
    if (rate.description !== undefined) db.description = rate.description;
    
    // Explicitly sanitizing arrays to prevent potential nesting issues
    if (rate.tier_access !== undefined) {
        db.tier_access = Array.isArray(rate.tier_access) ? [...rate.tier_access] : [];
    }
    if (rate.user_type_access !== undefined) {
        db.user_type_access = Array.isArray(rate.user_type_access) ? [...rate.user_type_access] : [];
    }
    
    if (rate.fileUrl !== undefined) db.file_url = rate.fileUrl;
    if (rate.imageUrl !== undefined) db.image_url = rate.imageUrl;
    if (rate.isNett !== undefined) db.is_nett = rate.isNett;
    
    if (rate.uploaded_at !== undefined) {
        db.uploaded_at = rate.uploaded_at instanceof Date 
            ? rate.uploaded_at.toISOString() 
            : new Date(rate.uploaded_at).toISOString();
    }
    
    return db;
};

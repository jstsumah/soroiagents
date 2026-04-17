'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { ExclusiveDeal } from '@/lib/types';
import { getAuthenticatedUser } from './auth-service';
import { logActivity } from './audit-log-service';
import { deleteFile } from './storage-service';

export const getDeals = async (): Promise<ExclusiveDeal[]> => {
    const supabaseAdmin = getSupabaseAdmin();
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    
    while (true) {
        const { data, error } = await supabaseAdmin
            .from('exclusive_deals')
            .select('*')
            .range(from, from + step - 1)
            .order('valid_until', { ascending: false });
        
        if (error) {
            console.error('Error fetching deals:', error);
            break;
        }
        
        if (!data || data.length === 0) break;
        
        allData = [...allData, ...data];
        if (data.length < step) break;
        from += step;
    }

    const dealList = (allData || []).map(mapDbToDeal);
    
    // Manual sorting for featured deals
    dealList.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });

    return dealList;
};

export const getDeal = async (id: string): Promise<ExclusiveDeal | null> => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('exclusive_deals')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error(`Error fetching deal ${id}:`, error);
        return null;
    }

    return data ? mapDbToDeal(data) : null;
};

export const addDeal = async (data: Omit<ExclusiveDeal, 'id'>): Promise<string> => {
    const dbData = mapDealToDb(data);
    const supabaseAdmin = getSupabaseAdmin();
    const { data: insertedData, error } = await supabaseAdmin
        .from('exclusive_deals')
        .insert(dbData)
        .select()
        .single();

    if (error) throw error;

    try {
        const user = await getAuthenticatedUser();
        if (user) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: 'deal.create',
                details: { dealId: insertedData.id, dealTitle: data.title }
            });
        }
    } catch (e) {
        console.error('Could not log deal creation activity:', e);
    }

    return insertedData.id;
};

export const updateDeal = async (id: string, data: Partial<ExclusiveDeal>): Promise<void> => {
    const dbData = mapDealToDb(data);
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('exclusive_deals')
        .update(dbData)
        .eq('id', id);

    if (error) throw error;

    try {
        const user = await getAuthenticatedUser();
        if (user) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: 'deal.update',
                details: { dealId: id, dealTitle: data.title || 'Unknown' }
            });
        }
    } catch (e) {
        console.error('Could not log deal update activity:', e);
    }
};

export const deleteDeal = async (id: string): Promise<void> => {
    const deal = await getDeal(id);
    if (!deal) return;

    // Delete files from storage
    if (deal.fileUrl) await deleteFile(deal.fileUrl);
    if (deal.imageUrl) await deleteFile(deal.imageUrl);

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('exclusive_deals')
        .delete()
        .eq('id', id);

    if (error) throw error;

    try {
        const user = await getAuthenticatedUser();
        if (user) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: 'deal.delete',
                details: { dealId: id, dealTitle: deal.title }
            });
        }
    } catch (e) {
        console.error('Could not log deal deletion activity:', e);
    }
};

export const getFeaturedDeal = async (): Promise<ExclusiveDeal | null> => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('exclusive_deals')
        .select('*')
        .eq('featured', true)
        .limit(1)
        .maybeSingle();

    if (data) return mapDbToDeal(data);

    // Fallback: if no featured deal, get the one expiring latest.
    const { data: fallbackData } = await supabaseAdmin
        .from('exclusive_deals')
        .select('*')
        .order('valid_until', { ascending: false })
        .limit(1)
        .maybeSingle();

    return fallbackData ? mapDbToDeal(fallbackData) : null;
}

const mapDbToDeal = (db: any): ExclusiveDeal => ({
    id: db.id,
    title: db.title,
    description: db.description || '',
    tier_access: db.tier_access || [],
    user_type_access: db.user_type_access || [],
    fileUrl: db.file_url,
    imageUrl: db.image_url,
    valid_until: new Date(db.valid_until),
    featured: db.featured,
    uploaded_at: new Date(db.uploaded_at)
});

const mapDealToDb = (deal: Partial<ExclusiveDeal>): any => {
    const db: any = {};
    if (deal.title !== undefined) db.title = deal.title;
    if (deal.description !== undefined) db.description = deal.description;
    if (deal.tier_access !== undefined) db.tier_access = deal.tier_access;
    if (deal.user_type_access !== undefined) db.user_type_access = deal.user_type_access;
    if (deal.fileUrl !== undefined) db.file_url = deal.fileUrl;
    if (deal.imageUrl !== undefined) db.image_url = deal.imageUrl;
    if (deal.valid_until !== undefined) db.valid_until = deal.valid_until.toISOString();
    if (deal.featured !== undefined) db.featured = deal.featured;
    if (deal.uploaded_at !== undefined) db.uploaded_at = deal.uploaded_at.toISOString();
    return db;
};

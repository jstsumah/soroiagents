'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { PackagedItinerary } from '@/lib/types';
import { getAuthenticatedUser, ensureAdmin, isAdmin } from './auth-service';
import { logActivity } from './audit-log-service';

import { deleteFile, uploadFile } from './storage-service';

export const getItineraries = async (): Promise<PackagedItinerary[]> => {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    const supabaseAdmin = getSupabaseAdmin();
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    
    while (true) {
        const { data, error } = await supabaseAdmin
            .from('packaged_itineraries')
            .select('*')
            .range(from, from + step - 1)
            .order('featured', { ascending: false })
            .order('title', { ascending: true });
        
        if (error) {
            console.error('Error fetching itineraries:', error);
            break;
        }
        
        if (!data || data.length === 0) break;
        
        allData = [...allData, ...data];
        if (data.length < step) break;
        from += step;
    }

    let itineraries = (allData || []).map(mapDbToItinerary);
    
    // If not admin, filter by tier and user type access
    const isUserAdmin = await isAdmin(user);
    if (!isUserAdmin) {
        itineraries = itineraries.filter(it => {
            const hasTierAccess = !it.tier_access || 
                                 it.tier_access.length === 0 || 
                                 it.tier_access.includes(user.tier || 'Brass') ||
                                 user.hasAllTierAccess;
            
            const hasTypeAccess = !it.user_type_access || 
                                 it.user_type_access.length === 0 || 
                                 it.user_type_access.includes(user.type || 'international');
            
            return hasTierAccess && hasTypeAccess;
        });
    }

    return itineraries;
};

export const getItinerary = async (id: string): Promise<PackagedItinerary | null> => {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('packaged_itineraries')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error(`Error fetching itinerary ${id}:`, error);
        throw error;
    }
    if (data) {
        const itinerary = mapDbToItinerary(data);
        // Authorization check for non-admins
        const isUserAdmin = await isAdmin(user);
        if (!isUserAdmin) {
            const hasTierAccess = !itinerary.tier_access || 
                                 itinerary.tier_access.length === 0 || 
                                 itinerary.tier_access.includes(user.tier || 'Brass') ||
                                 user.hasAllTierAccess;
            
            const hasTypeAccess = !itinerary.user_type_access || 
                                 itinerary.user_type_access.length === 0 || 
                                 itinerary.user_type_access.includes(user.type || 'international');
            
            if (!hasTierAccess || !hasTypeAccess) return null;
        }
        return itinerary;
    }
    return null;
};

export const addItinerary = async (data: Omit<PackagedItinerary, 'id'>): Promise<string> => {
    const user = await ensureAdmin();
    const dbData = mapItineraryToDb(data);
    const supabaseAdmin = getSupabaseAdmin();
    const { data: insertedData, error } = await supabaseAdmin
        .from('packaged_itineraries')
        .insert([{
            ...dbData,
            featured: data.featured || false
        }])
        .select()
        .single();

    if (error) {
        console.error('Error adding itinerary:', error);
        throw error;
    }

    try {
        await logActivity({
            userId: user.uid,
            userName: user.name,
            action: 'itinerary.create',
            details: { itineraryId: insertedData.id, itineraryTitle: data.title }
        });
    } catch (e) {
        console.error('Could not log itinerary creation activity:', e);
    }
    return insertedData.id;
};

export const updateItinerary = async (id: string, data: Partial<PackagedItinerary>): Promise<void> => {
    const user = await ensureAdmin();
    const dbData = mapItineraryToDb(data);
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('packaged_itineraries')
        .update(dbData)
        .eq('id', id);

    if (error) {
        console.error(`Error updating itinerary ${id}:`, error);
        throw error;
    }

    try {
        await logActivity({
            userId: user.uid,
            userName: user.name,
            action: 'itinerary.update',
            details: { itineraryId: id, itineraryTitle: data.title || 'Unknown' }
        });
    } catch (e) {
        console.error('Could not log itinerary update activity:', e);
    }
};

export const deleteItinerary = async (id: string): Promise<void> => {
    const user = await ensureAdmin();
    const itineraryData = await getItinerary(id);
    if (!itineraryData) return;

    const supabaseAdmin = getSupabaseAdmin();

    // Delete associated files
    if (itineraryData.packages) {
        for (const pkg of itineraryData.packages) {
            if (pkg.driveIn?.type === 'file' && pkg.driveIn.value) {
                await deleteFile(pkg.driveIn.value).catch(e => console.error('Error deleting driveIn file:', e));
            }
            if (pkg.flyIn?.type === 'file' && pkg.flyIn.value) {
                await deleteFile(pkg.flyIn.value).catch(e => console.error('Error deleting flyIn file:', e));
            }
            if (pkg.railSafari?.type === 'file' && pkg.railSafari.value) {
                await deleteFile(pkg.railSafari.value).catch(e => console.error('Error deleting railSafari file:', e));
            }
        }
    }

    const { error } = await supabaseAdmin
        .from('packaged_itineraries')
        .delete()
        .eq('id', id);

    if (error) {
        console.error(`Error deleting itinerary ${id}:`, error);
        throw error;
    }

    try {
        await logActivity({
            userId: user.uid,
            userName: user.name,
            action: 'itinerary.delete',
            details: { itineraryId: id, itineraryTitle: itineraryData.title }
        });
    } catch (e) {
        console.error('Could not log itinerary deletion activity:', e);
    }
};

const mapDbToItinerary = (db: any): PackagedItinerary => ({
    id: db.id,
    title: db.title,
    commissionInfo: db.commission_info,
    description: db.description,
    notes: db.notes,
    packages: db.packages || [],
    tier_access: db.tier_access || [],
    user_type_access: db.user_type_access || [],
    uploaded_at: new Date(db.uploaded_at),
    featured: db.featured,
    isNetPackage: db.is_net_package,
});

const mapItineraryToDb = (itinerary: Partial<PackagedItinerary>): any => {
    const db: any = {};
    if (itinerary.title !== undefined) db.title = itinerary.title;
    if (itinerary.commissionInfo !== undefined) db.commission_info = itinerary.commissionInfo;
    if (itinerary.description !== undefined) db.description = itinerary.description;
    if (itinerary.notes !== undefined) db.notes = itinerary.notes;
    if (itinerary.packages !== undefined) db.packages = itinerary.packages;
    if (itinerary.tier_access !== undefined) db.tier_access = itinerary.tier_access;
    if (itinerary.user_type_access !== undefined) db.user_type_access = itinerary.user_type_access;
    if (itinerary.uploaded_at !== undefined) db.uploaded_at = itinerary.uploaded_at.toISOString();
    if (itinerary.featured !== undefined) db.featured = itinerary.featured;
    if (itinerary.isNetPackage !== undefined) db.is_net_package = itinerary.isNetPackage;
    return db;
};

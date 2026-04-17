'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { PackagedItinerary } from '@/lib/types';
import { getAuthenticatedUser } from './auth-service';
import { logActivity } from './audit-log-service';

import { deleteFile, uploadFile } from './storage-service';

export const getItineraries = async (): Promise<PackagedItinerary[]> => {
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

    return (allData || []) as PackagedItinerary[];
};

export const getItinerary = async (id: string): Promise<PackagedItinerary | null> => {
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
    return data as PackagedItinerary;
};

export const addItinerary = async (data: Omit<PackagedItinerary, 'id'>): Promise<string> => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: insertedData, error } = await supabaseAdmin
        .from('packaged_itineraries')
        .insert([{
            ...data,
            featured: data.featured || false
        }])
        .select()
        .single();

    if (error) {
        console.error('Error adding itinerary:', error);
        throw error;
    }

    try {
        const user = await getAuthenticatedUser();
        if (user) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: 'itinerary.create',
                details: { itineraryId: insertedData.id, itineraryTitle: data.title }
            });
        }
    } catch (e) {
        console.error('Could not log itinerary creation activity:', e);
    }
    return insertedData.id;
};

export const updateItinerary = async (id: string, data: Partial<PackagedItinerary>): Promise<void> => {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('packaged_itineraries')
        .update(data)
        .eq('id', id);

    if (error) {
        console.error(`Error updating itinerary ${id}:`, error);
        throw error;
    }

    try {
        const user = await getAuthenticatedUser();
        if (user) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: 'itinerary.update',
                details: { itineraryId: id, itineraryTitle: data.title || 'Unknown' }
            });
        }
    } catch (e) {
        console.error('Could not log itinerary update activity:', e);
    }
};

export const deleteItinerary = async (id: string): Promise<void> => {
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
        const user = await getAuthenticatedUser();
        if (user && itineraryData) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: 'itinerary.delete',
                details: { itineraryId: id, itineraryTitle: itineraryData.title }
            });
        }
    } catch (e) {
        console.error('Could not log itinerary deletion activity:', e);
    }
};

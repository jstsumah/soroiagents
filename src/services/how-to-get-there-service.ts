'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { HowToGetThereLocation } from '@/lib/types';
import { getAuthenticatedUser } from './auth-service';
import { logActivity } from './audit-log-service';
import { deleteFile } from './storage-service';

export const getLocations = async (): Promise<HowToGetThereLocation[]> => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('how_to_get_there_locations')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching locations:', error);
        return [];
    }
    return (data || []).map(mapDbToLocation);
};

export const getLocation = async (id: string): Promise<HowToGetThereLocation | null> => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('how_to_get_there_locations')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error(`Error fetching location ${id}:`, error);
        throw error;
    }
    return data ? mapDbToLocation(data) : null;
};

export const addLocation = async (data: Omit<HowToGetThereLocation, 'id'>): Promise<string> => {
    const dbData = mapLocationToDb(data);
    const supabaseAdmin = getSupabaseAdmin();
    const { data: insertedData, error } = await supabaseAdmin
        .from('how_to_get_there_locations')
        .insert([dbData])
        .select()
        .single();

    if (error) {
        console.error('Error adding location:', error);
        throw error;
    }

    try {
        const user = await getAuthenticatedUser();
        if (user) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: 'howToGetThere.create',
                details: { locationId: insertedData.id, locationName: data.name }
            });
        }
    } catch (e) {
        console.error('Could not log location creation activity:', e);
    }

    return insertedData.id;
};

export const updateLocation = async (id: string, data: Partial<HowToGetThereLocation>): Promise<void> => {
    const dbData = mapLocationToDb(data);
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('how_to_get_there_locations')
        .update(dbData)
        .eq('id', id);

    if (error) {
        console.error(`Error updating location ${id}:`, error);
        throw error;
    }

    try {
        const user = await getAuthenticatedUser();
        if (user) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: 'howToGetThere.update',
                details: { locationId: id, locationName: data.name || 'Unknown' }
            });
        }
    } catch (e) {
        console.error('Could log location update activity:', e);
    }
};

export const deleteLocation = async (id: string): Promise<void> => {
    const locationData = await getLocation(id);
    if (!locationData) return;

    // Delete map image from storage
    if (locationData.mapUrl) await deleteFile(locationData.mapUrl);

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('how_to_get_there_locations')
        .delete()
        .eq('id', id);

    if (error) {
        console.error(`Error deleting location ${id}:`, error);
        throw error;
    }

    try {
        const user = await getAuthenticatedUser();
        if (user && locationData) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: 'howToGetThere.delete',
                details: { locationId: id, locationName: locationData.name }
            });
        }
    } catch (e) {
        console.error('Could not log location deletion activity:', e);
    }
};

const mapDbToLocation = (db: any): HowToGetThereLocation => ({
    id: db.id,
    name: db.name,
    mapUrl: db.map_url,
    flights: db.flights || [],
    trains: db.trains || [],
    roads: db.roads || [],
    tier_access: db.tier_access || [],
});

const mapLocationToDb = (location: Partial<HowToGetThereLocation>): any => {
    const db: any = {};
    if (location.name !== undefined) db.name = location.name;
    if (location.mapUrl !== undefined) db.map_url = location.mapUrl;
    if (location.flights !== undefined) db.flights = location.flights;
    if (location.trains !== undefined) db.trains = location.trains;
    if (location.roads !== undefined) db.roads = location.roads;
    if (location.tier_access !== undefined) db.tier_access = location.tier_access;
    return db;
};

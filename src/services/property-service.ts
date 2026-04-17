'use server';

import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { Property } from '@/lib/types';
import { logActivity } from './audit-log-service';
import { getAuthenticatedUser } from './auth-service';
import { deleteFile } from './storage-service';

export const getProperties = async (): Promise<Property[]> => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('properties')
        .select('*')
        .order('featured', { ascending: false })
        .order('name', { ascending: true });
    
    if (error) {
        console.error('Error fetching properties:', error);
        return [];
    }

    return (data || []).map(mapDbToProperty);
};

export const getProperty = async (id: string): Promise<Property | null> => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error(`Error fetching property ${id}:`, error);
        return null;
    }

    return data ? mapDbToProperty(data) : null;
};

export const addProperty = async (data: Omit<Property, 'id'>): Promise<string> => {
    const user = await getAuthenticatedUser();
    const dbData = mapPropertyToDb(data);
    const supabaseAdmin = getSupabaseAdmin();
    const { data: insertedData, error } = await supabaseAdmin
        .from('properties')
        .insert({ ...dbData, featured: data.featured || false })
        .select()
        .single();

    if (error) throw error;
    
    if (user) {
        await logActivity({
            userId: user.uid,
            userName: user.name,
            action: 'property.create',
            details: { propertyId: insertedData.id, propertyName: data.name }
        });
    }

    return insertedData.id;
};

export const updateProperty = async (id: string, data: Partial<Property>): Promise<void> => {
    const user = await getAuthenticatedUser();
    const dbData = mapPropertyToDb(data);
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('properties')
        .update(dbData)
        .eq('id', id);

    if (error) throw error;

    if (user) {
         await logActivity({
            userId: user.uid,
            userName: user.name,
            action: 'property.update',
            details: { propertyId: id, propertyName: data.name || 'Unknown' }
        });
    }
};

export const deleteProperty = async (id: string): Promise<void> => {
    const user = await getAuthenticatedUser();
    const property = await getProperty(id);

    if (!property) {
        console.error(`Property with ID ${id} not found.`);
        return;
    }

    // Delete images from storage
    if (property.images && property.images.length > 0) {
        for (const imageUrl of property.images) {
            await deleteFile(imageUrl);
        }
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('properties')
        .delete()
        .eq('id', id);

    if (error) throw error;

    if (user) {
        await logActivity({
            userId: user.uid,
            userName: user.name,
            action: 'property.delete',
            details: { propertyId: id, propertyName: property.name }
        });
    }
};

export const getFeaturedProperty = async (): Promise<Property | null> => {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('properties')
    .select('*')
    .eq('featured', true)
    .limit(1)
    .maybeSingle();

  if (data) return mapDbToProperty(data);

  // Fallback: if no featured property, get the first one by name.
  const { data: fallbackData } = await supabaseAdmin
    .from('properties')
    .select('*')
    .order('name', { ascending: true })
    .limit(1)
    .maybeSingle();

  return fallbackData ? mapDbToProperty(fallbackData) : null;
};

export const searchProperties = async (searchQuery: string): Promise<Partial<Property>[]> => {
    if (!searchQuery) return [];
    
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('properties')
        .select('id, name, location, description, total_rooms')
        .or(`name.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

    if (error) {
        console.error('Error searching properties:', error);
        return [];
    }

    return data || [];
}

const mapDbToProperty = (db: any): Property => ({
    id: db.id,
    name: db.name,
    type: db.type,
    location: db.location,
    description: db.description || '',
    images: db.images || [],
    total_rooms: db.total_rooms || 0,
    room_types: db.room_types || [],
    facilities: db.facilities || [],
    amenities: db.amenities || [],
    activities: db.activities || [],
    wetu_ibrochure_url: db.wetu_ibrochure_url,
    featured: db.featured,
    created_at: new Date(db.created_at)
});

const mapPropertyToDb = (prop: Partial<Property>): any => {
    const db: any = {};
    if (prop.name !== undefined) db.name = prop.name;
    if (prop.type !== undefined) db.type = prop.type;
    if (prop.location !== undefined) db.location = prop.location;
    if (prop.description !== undefined) db.description = prop.description;
    if (prop.images !== undefined) db.images = prop.images;
    if (prop.total_rooms !== undefined) db.total_rooms = prop.total_rooms;
    if (prop.room_types !== undefined) db.room_types = prop.room_types;
    if (prop.facilities !== undefined) db.facilities = prop.facilities;
    if (prop.amenities !== undefined) db.amenities = prop.amenities;
    if (prop.activities !== undefined) db.activities = prop.activities;
    if (prop.wetu_ibrochure_url !== undefined) db.wetu_ibrochure_url = prop.wetu_ibrochure_url;
    if (prop.featured !== undefined) db.featured = prop.featured;
    return db;
};

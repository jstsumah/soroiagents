'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { TrainingResource } from '@/lib/types';
import { getAuthenticatedUser } from './auth-service';
import { logActivity } from './audit-log-service';

import { deleteFile, uploadFile } from './storage-service';

export const getTrainingResources = async (): Promise<TrainingResource[]> => {
    const supabaseAdmin = getSupabaseAdmin();
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    
    while (true) {
        const { data, error } = await supabaseAdmin
            .from('training_resources')
            .select('*')
            .range(from, from + step - 1)
            .order('uploaded_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching training resources:', error);
            break;
        }
        
        if (!data || data.length === 0) break;
        
        allData = [...allData, ...data];
        if (data.length < step) break;
        from += step;
    }

    return (allData || []).map(mapDbToTrainingResource);
};

export const getTrainingResource = async (id: string): Promise<TrainingResource | null> => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('training_resources')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error(`Error fetching training resource ${id}:`, error);
        throw error;
    }
    return data ? mapDbToTrainingResource(data) : null;
};

export const addTrainingResource = async (data: Omit<TrainingResource, 'id'>): Promise<string> => {
    const dbData = mapTrainingResourceToDb(data);
    const supabaseAdmin = getSupabaseAdmin();
    const { data: insertedData, error } = await supabaseAdmin
        .from('training_resources')
        .insert([dbData])
        .select()
        .single();

    if (error) {
        console.error('Error adding training resource:', error);
        throw error;
    }

    try {
        const user = await getAuthenticatedUser();
        if (user) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: 'training.create',
                details: { resourceId: insertedData.id, resourceTitle: data.title }
            });
        }
    } catch (e) {
        console.error('Could not log training resource creation activity:', e);
    }

    return insertedData.id;
};

export const updateTrainingResource = async (id: string, data: Partial<Omit<TrainingResource, 'id' | 'uploaded_at'>>): Promise<void> => {
    const dbData = mapTrainingResourceToDb(data);
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('training_resources')
        .update(dbData)
        .eq('id', id);

    if (error) {
        console.error(`Error updating training resource ${id}:`, error);
        throw error;
    }

    try {
        const user = await getAuthenticatedUser();
        if (user) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: 'training.update',
                details: { resourceId: id, resourceTitle: data.title || 'Unknown' }
            });
        }
    } catch (e) {
        console.error('Could not log training resource update activity:', e);
    }
};

export const deleteTrainingResource = async (id: string): Promise<void> => {
    const resourceData = await getTrainingResource(id);
    if (!resourceData) return;

    const supabaseAdmin = getSupabaseAdmin();

    // Handle file deletion if it's in Supabase Storage
    if (resourceData.fileUrl) {
        try {
            await deleteFile(resourceData.fileUrl);
        } catch (error) {
            console.error(`Failed to delete file at ${resourceData.fileUrl}:`, error);
        }
    }

    const { error } = await supabaseAdmin
        .from('training_resources')
        .delete()
        .eq('id', id);

    if (error) {
        console.error(`Error deleting training resource ${id}:`, error);
        throw error;
    }

    try {
        const user = await getAuthenticatedUser();
        if (user) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: 'training.delete',
                details: { resourceId: id, resourceTitle: resourceData.title }
            });
        }
    } catch (e) {
        console.error('Could not log training resource deletion activity:', e);
    }
};

const mapDbToTrainingResource = (db: any): TrainingResource => ({
    id: db.id,
    title: db.title,
    category: db.category,
    tier_access: db.tier_access || [],
    fileUrl: db.file_url,
    externalLink: db.external_link,
    uploaded_at: new Date(db.uploaded_at)
});

const mapTrainingResourceToDb = (resource: Partial<TrainingResource>): any => {
    const db: any = {};
    if (resource.title !== undefined) db.title = resource.title;
    if (resource.category !== undefined) db.category = resource.category;
    if (resource.tier_access !== undefined) db.tier_access = resource.tier_access;
    if (resource.fileUrl !== undefined) db.file_url = resource.fileUrl;
    if (resource.externalLink !== undefined) db.external_link = resource.externalLink;
    if (resource.uploaded_at !== undefined) db.uploaded_at = resource.uploaded_at.toISOString();
    return db;
};

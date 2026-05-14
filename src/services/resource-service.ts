'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { Resource } from '@/lib/types';
import { getAuthenticatedUser, ensureAdmin, isAdmin } from './auth-service';
import { logActivity } from './audit-log-service';
import { deleteFile } from './storage-service';

export const getResources = async (): Promise<Resource[]> => {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    const supabaseAdmin = getSupabaseAdmin();
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    
    while (true) {
        const { data, error } = await supabaseAdmin
            .from('resources')
            .select('*')
            .range(from, from + step - 1)
            .order('uploaded_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching resources:', error);
            break;
        }
        
        if (!data || data.length === 0) break;
        
        allData = [...allData, ...data];
        if (data.length < step) break;
        from += step;
    }

    let resources = (allData || []).map(mapDbToResource);
    
    // If not admin, filter by tier access
    const isUserAdmin = await isAdmin(user);
    if (!isUserAdmin) {
        resources = resources.filter(res => 
            !res.tier_access || 
            res.tier_access.length === 0 || 
            res.tier_access.includes(user.tier || 'Brass') ||
            user.hasAllTierAccess
        );
    }

    return resources;
};

export const getResource = async (id: string): Promise<Resource | null> => {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('resources')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error(`Error fetching resource ${id}:`, error);
        return null;
    }

    if (data) {
        const resource = mapDbToResource(data);
        // Authorization check for non-admins
        const isUserAdmin = await isAdmin(user);
        if (!isUserAdmin) {
            const hasAccess = !resource.tier_access || 
                              resource.tier_access.length === 0 || 
                              resource.tier_access.includes(user.tier || 'Brass') ||
                              user.hasAllTierAccess;
            if (!hasAccess) return null;
        }
        return resource;
    }

    return null;
};

export const addResource = async (data: Omit<Resource, 'id'>): Promise<string> => {
    const user = await ensureAdmin();
    const dbData = mapResourceToDb(data);
    const supabaseAdmin = getSupabaseAdmin();
    const { data: insertedData, error } = await supabaseAdmin
        .from('resources')
        .insert(dbData)
        .select()
        .single();

    if (error) throw error;

    try {
        await logActivity({
            userId: user.uid,
            userName: user.name,
            action: 'resource.create',
            details: { resourceId: insertedData.id, resourceTitle: data.title }
        });
    } catch (e) {
        console.error('Could not log resource creation activity:', e);
    }

    return insertedData.id;
};

export const updateResource = async (id: string, data: Partial<Resource>): Promise<void> => {
    const user = await ensureAdmin();
    const oldResource = await getResource(id);

    // Identify files to delete if they are being replaced
    if (oldResource) {
        if (data.fileUrl && oldResource.fileUrl && data.fileUrl !== oldResource.fileUrl) {
            await deleteFile(oldResource.fileUrl).catch(e => console.error('Cleanup error (file):', e));
        }
        if (data.imageUrl && oldResource.imageUrl && data.imageUrl !== oldResource.imageUrl) {
            await deleteFile(oldResource.imageUrl).catch(e => console.error('Cleanup error (image):', e));
        }
    }

    const dbData = mapResourceToDb(data);
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('resources')
        .update(dbData)
        .eq('id', id);

    if (error) throw error;

    try {
        await logActivity({
            userId: user.uid,
            userName: user.name,
            action: 'resource.update',
            details: { resourceId: id, resourceTitle: data.title || 'Unknown' }
        });
    } catch (e) {
        console.error('Could not log resource update activity:', e);
    }
};

export const deleteResource = async (id: string): Promise<void> => {
    const user = await ensureAdmin();
    const resource = await getResource(id);
    if (!resource) return;

    // Delete files from storage
    if (resource.file_url) await deleteFile(resource.file_url);
    if (resource.imageUrl) await deleteFile(resource.imageUrl);

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('resources')
        .delete()
        .eq('id', id);

    if (error) throw error;

    try {
        await logActivity({
            userId: user.uid,
            userName: user.name,
            action: 'resource.delete',
            details: { resourceId: id, resourceTitle: resource.title }
        });
    } catch (e) {
        console.error('Could not log resource deletion activity:', e);
    }
};

export const importResources = async (resources: Partial<Resource>[]): Promise<{ successCount: number; errors: string[] }> => {
    const user = await ensureAdmin();
    const supabaseAdmin = getSupabaseAdmin();
    const errors: string[] = [];
    let successCount = 0;

    for (const resource of resources) {
        try {
            const dbData = mapResourceToDb(resource);
            const { error } = await supabaseAdmin
                .from('resources')
                .upsert(dbData, { onConflict: 'id' });

            if (error) throw error;
            successCount++;
        } catch (e: any) {
            errors.push(`Error importing "${resource.title || 'Unknown'}": ${e.message}`);
        }
    }

    try {
        await logActivity({
            userId: user.uid,
            userName: user.name,
            action: 'resource.import',
            details: { count: successCount, errorCount: errors.length }
        });
    } catch (e) {}

    return { successCount, errors };
};

const mapDbToResource = (db: any): Resource => ({
    id: db.id,
    title: db.title,
    description: db.description || '',
    category: db.category,
    tier_access: db.tier_access || [],
    file_url: db.file_url,
    uploaded_at: new Date(db.uploaded_at),
    imageUrl: db.image_url
});

const mapResourceToDb = (resource: Partial<Resource>): any => {
    const db: any = {};
    if (resource.title !== undefined) db.title = resource.title;
    if (resource.description !== undefined) db.description = resource.description;
    if (resource.category !== undefined) db.category = resource.category;
    if (resource.tier_access !== undefined) db.tier_access = resource.tier_access;
    if (resource.file_url !== undefined) db.file_url = resource.file_url;
    if (resource.uploaded_at !== undefined) db.uploaded_at = resource.uploaded_at.toISOString();
    if (resource.imageUrl !== undefined) db.image_url = resource.imageUrl;
    return db;
};

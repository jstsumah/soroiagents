'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';



/**
 * Deletes a file from Supabase Storage given its public URL.
 */
export const deleteFile = async (url: string): Promise<void> => {
    if (!url || !url.includes('supabase.co')) return;

    try {
        const supabase = getSupabaseAdmin();
        // Extract path from URL
        // URL format: https://[project-id].supabase.co/storage/v1/object/public/[bucket]/[path]
        const urlParts = url.split('/storage/v1/object/public/');
        if (urlParts.length > 1) {
            const fullPath = urlParts[1];
            const bucket = fullPath.split('/')[0];
            const path = fullPath.split('/').slice(1).join('/');
            
            const { error } = await supabase.storage.from(bucket).remove([path]);
            if (error) {
                console.error(`Failed to delete file from storage: ${url}`, error);
            }
        }
    } catch (error) {
        console.error(`Error in deleteFile for ${url}:`, error);
    }
};

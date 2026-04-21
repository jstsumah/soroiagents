'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Uploads a file to Supabase Storage.
 * Note: Requires a bucket named 'soroi' to be created in Supabase.
 */
export const uploadFile = async (base64OrBuffer: string, path: string, contentType: string): Promise<string> => {
    try {
        const supabase = getSupabaseAdmin();
        // The base64 string might be a data URL, so we need to extract just the data part.
        const base64Data = base64OrBuffer.split(',')[1] || base64OrBuffer;
        const buffer = Buffer.from(base64Data, 'base64');

        // We use 'soroi' as the default bucket name. 
        // Ensure this bucket is created and public if you want public URLs.
        const bucketName = 'soroi';

        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(path, buffer, {
                contentType,
                upsert: true
            });

        if (error) {
            console.error('Supabase Storage Upload Error:', error);
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(path);

        return publicUrl;
    } catch (error: any) {
        console.error('Error in uploadFile:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
    }
};

/**
 * Uploads a file using FormData to avoid Base64 Server Action payload limits (Next.js 15).
 */
export const uploadFileFromFormData = async (formData: FormData): Promise<string> => {
    try {
        const file = formData.get('file');
        const path = formData.get('path');
        
        if (!file || !path || typeof path !== 'string') {
            throw new Error(`Missing file or path. File: ${!!file}, Path: ${path}`);
        }

        // In some environments, instanceof File might fail, so we check for essential properties
        const isFileLike = file && typeof (file as any).arrayBuffer === 'function' && (file as any).name !== undefined;
        
        if (!isFileLike) {
             throw new Error(`The provided "file" is not a valid File/Blob object. Type: ${typeof file}`);
        }

        const supabase = getSupabaseAdmin();
        const fileObject = file as unknown as File;
        const arrayBuffer = await fileObject.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const bucketName = 'soroi';

        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(path, buffer, {
                contentType: file.type,
                upsert: true
            });

        if (error) {
            console.error('Supabase Storage Upload Error:', error);
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(path);

        return publicUrl;
    } catch (error: any) {
        console.error('Error in uploadFileFromFormData:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
    }
};

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

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { deleteFile } from './storage-service';

/**
 * Maintenance Service - Production Grade
 * Handles cleanup of orphaned files in Supabase Storage.
 */

interface CleanupResult {
    totalFilesChecked: number;
    orphansFound: number;
    deletedCount: number;
    errors: string[];
}

export const cleanupOrphanedFiles = async (): Promise<CleanupResult> => {
    const supabase = getSupabaseAdmin();
    const result: CleanupResult = {
        totalFilesChecked: 0,
        orphansFound: 0,
        deletedCount: 0,
        errors: []
    };

    try {
        console.log('[Maintenance] Starting orphaned file cleanup...');

        // 1. Collect all valid URLs from the database
        const referencedUrls = new Set<string>();

        // Resources
        const { data: resources } = await supabase.from('resources').select('file_url, imageUrl');
        resources?.forEach(r => {
            if (r.file_url) referencedUrls.add(r.file_url);
            if (r.imageUrl) referencedUrls.add(r.imageUrl);
        });

        // Companies
        const { data: companies } = await supabase.from('companies').select('company_reg_doc, tra_license_doc, signed_contracts');
        companies?.forEach(c => {
            if (c.company_reg_doc?.url) referencedUrls.add(c.company_reg_doc.url);
            if (c.tra_license_doc?.url) referencedUrls.add(c.tra_license_doc.url);
            if (Array.isArray(c.signed_contracts)) {
                c.signed_contracts.forEach((contract: any) => {
                    if (contract.url) referencedUrls.add(contract.url);
                });
            }
        });

        // Rates
        const { data: rates } = await supabase.from('rates').select('fileUrl, imageUrl');
        rates?.forEach(r => {
            if (r.fileUrl) referencedUrls.add(r.fileUrl);
            if (r.imageUrl) referencedUrls.add(r.imageUrl);
        });

        // Exclusive Deals
        const { data: deals } = await supabase.from('exclusive_deals').select('fileUrl, imageUrl');
        deals?.forEach(d => {
            if (d.fileUrl) referencedUrls.add(d.fileUrl);
            if (d.imageUrl) referencedUrls.add(d.imageUrl);
        });

        // Itineraries
        const { data: itineraries } = await supabase.from('itineraries').select('packages');
        itineraries?.forEach(it => {
            if (Array.isArray(it.packages)) {
                it.packages.forEach((pkg: any) => {
                    ['driveIn', 'flyIn', 'railSafari'].forEach(key => {
                        const link = pkg[key];
                        if (link?.type === 'file' && link.value) {
                            referencedUrls.add(link.value);
                        }
                    });
                });
            }
        });

        // Properties
        const { data: properties } = await supabase.from('properties').select('images');
        properties?.forEach(p => {
            if (Array.isArray(p.images)) {
                p.images.forEach((url: string) => referencedUrls.add(url));
            }
        });

        // Training Resources
        const { data: training } = await supabase.from('training_resources').select('file_url, imageUrl');
        training?.forEach(t => {
            if (t.file_url) referencedUrls.add(t.file_url);
            if (t.imageUrl) referencedUrls.add(t.imageUrl);
        });

        console.log(`[Maintenance] Found ${referencedUrls.size} valid file references in DB.`);

        // 2. List all files in the 'soroi' bucket
        // Note: list() only goes one level deep by default. We need recursive listing.
        const bucketName = 'soroi';
        
        async function listAllFiles(path: string = ''): Promise<string[]> {
            const { data, error } = await supabase.storage.from(bucketName).list(path);
            if (error) {
                result.errors.push(`Failed to list path ${path}: ${error.message}`);
                return [];
            }

            let files: string[] = [];
            for (const item of data || []) {
                const fullItemPath = path ? `${path}/${item.name}` : item.name;
                if (item.id === undefined) { // It's a folder in some Supabase versions, but item.id is usually present for files
                    // Heuristic for folder: no id or metadata
                    const subFiles = await listAllFiles(fullItemPath);
                    files = [...files, ...subFiles];
                } else {
                    files.push(fullItemPath);
                }
            }
            return files;
        }

        // Improved listAllFiles to handle folders
        const allFilePaths: string[] = [];
        const foldersToProcess = [''];

        while (foldersToProcess.length > 0) {
            const currentPath = foldersToProcess.shift()!;
            const { data, error } = await supabase.storage.from(bucketName).list(currentPath);
            
            if (error) {
                result.errors.push(`Error listing ${currentPath}: ${error.message}`);
                continue;
            }

            for (const item of data || []) {
                const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
                // Supabase storage list() returns metadata for files. Folders usually don't have 'id' or 'metadata'.
                if (!item.id && !item.metadata) {
                    foldersToProcess.push(itemPath);
                } else {
                    allFilePaths.push(itemPath);
                }
            }
        }

        result.totalFilesChecked = allFilePaths.length;
        console.log(`[Maintenance] Total files in storage: ${allFilePaths.length}`);

        // 3. Identify and delete orphans
        // Construct the expected public URL prefix
        const { data: { publicUrl: testUrl } } = supabase.storage.from(bucketName).getPublicUrl('test.txt');
        const baseUrl = testUrl.replace('test.txt', '');

        for (const filePath of allFilePaths) {
            const fullPublicUrl = `${baseUrl}${filePath}`;
            
            if (!referencedUrls.has(fullPublicUrl)) {
                result.orphansFound++;
                console.log(`[Maintenance] Deleting orphan: ${filePath}`);
                
                const { error } = await supabase.storage.from(bucketName).remove([filePath]);
                if (error) {
                    result.errors.push(`Failed to delete ${filePath}: ${error.message}`);
                } else {
                    result.deletedCount++;
                }
            }
        }

        console.log(`[Maintenance] Cleanup finished. Orphans: ${result.orphansFound}, Deleted: ${result.deletedCount}`);

    } catch (error: any) {
        console.error('[Maintenance] Critical error during cleanup:', error);
        result.errors.push(error.message || 'An unexpected error occurred');
    }

    return result;
};

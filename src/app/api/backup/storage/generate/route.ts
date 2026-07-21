import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import AdmZip from 'adm-zip';
import { logActivity } from '@/services/audit-log-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function listAllFiles(supabaseAdmin: any, bucket: string, currentPath: string = ''): Promise<string[]> {
    const { data, error } = await supabaseAdmin.storage.from(bucket).list(currentPath);
    if (error || !data) return [];

    let allFiles: string[] = [];
    for (const item of data) {
        if (item.id) {
            allFiles.push(currentPath ? `${currentPath}/${item.name}` : item.name);
        } else {
            const subPath = currentPath ? `${currentPath}/${item.name}` : item.name;
            const subFiles = await listAllFiles(supabaseAdmin, bucket, subPath);
            allFiles.push(...subFiles);
        }
    }
    return allFiles;
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: userProfile } = await supabase.from('profiles').select('role, name').eq('id', session.user.id).single();
        if (userProfile?.role !== 'Super Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const supabaseAdmin = getSupabaseAdmin();
        const bucketName = 'soroi';
        
        const files = await listAllFiles(supabaseAdmin, bucketName);
        if (files.length === 0) {
            return NextResponse.json({ error: 'No files found to backup' }, { status: 400 });
        }

        const zip = new AdmZip();
        let totalSize = 0;

        for (const filePath of files) {
            const { data: fileData, error: downloadError } = await supabaseAdmin.storage
                .from(bucketName)
                .download(filePath);
            
            if (!downloadError && fileData) {
                const buffer = Buffer.from(await fileData.arrayBuffer());
                zip.addFile(filePath, buffer);
                totalSize += buffer.length;
            }
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `storage_backup_${bucketName}_${timestamp}.zip`;

        const zipBuffer = zip.toBuffer();
        
        const { error: uploadError } = await supabaseAdmin.storage
            .from('backups')
            .upload(backupFileName, zipBuffer, {
                contentType: 'application/zip',
                upsert: true
            });

        if (uploadError) throw uploadError;

        await logActivity({
            userId: session.user.id,
            userName: userProfile.name,
            action: 'backup.storage.generate',
            details: { filesCount: files.length, totalSize, backupFileName },
            status: 'success'
        });

        return NextResponse.json({ message: 'Storage backup generated', fileName: backupFileName, filesCount: files.length, totalSize });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

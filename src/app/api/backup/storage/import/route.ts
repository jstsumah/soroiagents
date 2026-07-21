import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import AdmZip from 'adm-zip';
import { logActivity } from '@/services/audit-log-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: userProfile } = await supabase.from('profiles').select('role, name').eq('id', session.user.id).single();
        if (userProfile?.role !== 'Super Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const targetBucket = formData.get('bucket') as string || 'soroi';
        
        if (!file || !file.name.endsWith('.zip')) {
            return NextResponse.json({ error: 'Invalid file. Must be a .zip archive.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const zip = new AdmZip(buffer);
        const zipEntries = zip.getEntries();
        
        const supabaseAdmin = getSupabaseAdmin();
        let restoredCount = 0;

        for (const entry of zipEntries) {
            if (!entry.isDirectory && !entry.entryName.startsWith('__MACOSX')) {
                let mimeType = 'application/octet-stream';
                if (entry.entryName.endsWith('.pdf')) mimeType = 'application/pdf';
                else if (entry.entryName.endsWith('.png')) mimeType = 'image/png';
                else if (entry.entryName.endsWith('.jpg') || entry.entryName.endsWith('.jpeg')) mimeType = 'image/jpeg';
                else if (entry.entryName.endsWith('.json')) mimeType = 'application/json';

                await supabaseAdmin.storage
                    .from(targetBucket)
                    .upload(entry.entryName, entry.getData(), {
                        contentType: mimeType,
                        upsert: true
                    });
                restoredCount++;
            }
        }

        await logActivity({
            userId: session.user.id,
            userName: userProfile.name,
            action: 'backup.storage.import',
            details: { bucket: targetBucket, fileName: file.name, count: restoredCount },
            status: 'success'
        });

        return NextResponse.json({ message: 'Storage backup imported successfully', count: restoredCount });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

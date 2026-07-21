import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import AdmZip from 'adm-zip';
import { logActivity } from '@/services/audit-log-service';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: userProfile } = await supabase.from('profiles').select('role, name').eq('id', session.user.id).single();
        if (userProfile?.role !== 'Super Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file || !file.name.endsWith('.zip')) {
            return NextResponse.json({ error: 'Invalid file. Must be a .zip archive.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const zip = new AdmZip(buffer);
        const zipEntries = zip.getEntries();
        
        const manifestEntry = zipEntries.find(e => e.entryName === 'manifest.json');
        if (!manifestEntry) {
            return NextResponse.json({ error: 'Invalid backup archive: missing manifest.json' }, { status: 400 });
        }

        const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
        if (!manifest.timestamp) {
            return NextResponse.json({ error: 'Invalid manifest format' }, { status: 400 });
        }

        const folderName = manifest.timestamp.replace(/[:.]/g, '-');
        const supabaseAdmin = getSupabaseAdmin();

        for (const entry of zipEntries) {
            if (!entry.isDirectory && entry.entryName.endsWith('.json')) {
                const filePath = `${folderName}/${entry.entryName}`;
                await supabaseAdmin.storage
                    .from('backups')
                    .upload(filePath, entry.getData(), {
                        contentType: 'application/json',
                        upsert: true
                    });
            }
        }

        await logActivity({
            userId: session.user.id,
            userName: userProfile.name,
            action: 'backup.import',
            details: { folderName, fileName: file.name },
            status: 'success'
        });

        return NextResponse.json({ message: 'Backup imported successfully', folderName });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

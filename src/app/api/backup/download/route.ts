import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import AdmZip from 'adm-zip';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (userProfile?.role !== 'Super Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { searchParams } = new URL(req.url);
        const backupName = searchParams.get('name');
        if (!backupName) return NextResponse.json({ error: 'Backup name required' }, { status: 400 });

        const supabaseAdmin = getSupabaseAdmin();
        const { data: files, error: listError } = await supabaseAdmin.storage
            .from('backups')
            .list(backupName);

        if (listError || !files || files.length === 0) {
            return NextResponse.json({ error: 'Backup not found or empty' }, { status: 404 });
        }

        const zip = new AdmZip();

        for (const file of files) {
            if (file.name) {
                const { data: fileData, error: downloadError } = await supabaseAdmin.storage
                    .from('backups')
                    .download(`${backupName}/${file.name}`);
                
                if (!downloadError && fileData) {
                    const buffer = Buffer.from(await fileData.arrayBuffer());
                    zip.addFile(file.name, buffer);
                }
            }
        }

        const zipBuffer = zip.toBuffer();

        return new NextResponse(zipBuffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="backup-${backupName}.zip"`,
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

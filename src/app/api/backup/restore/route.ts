import { NextResponse } from 'next/server';
import { restoreBackup } from '@/services/backup-service';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/services/audit-log-service';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: userProfile } = await supabase.from('profiles').select('role, name').eq('id', session.user.id).single();
        if (userProfile?.role !== 'Super Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await req.json();
        const { backupName, tables } = body;
        
        if (!backupName || !Array.isArray(tables)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const results = await restoreBackup(backupName, tables);

        await logActivity({
            userId: session.user.id,
            userName: userProfile.name,
            action: 'backup.restore',
            details: { backupName, tables, results },
            status: 'success'
        });

        return NextResponse.json({ message: 'Restore completed', results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

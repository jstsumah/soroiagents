import { NextResponse } from 'next/server';
import { listBackups } from '@/services/backup-service';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (userProfile?.role !== 'Super Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const backups = await listBackups();
        return NextResponse.json({ backups });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

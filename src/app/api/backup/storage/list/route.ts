import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (userProfile?.role !== 'Super Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const supabaseAdmin = getSupabaseAdmin();
        const { data: files, error: listError } = await supabaseAdmin.storage
            .from('backups')
            .list('', { search: 'storage_backup' });

        if (listError) throw listError;

        const backups = (files || [])
            .filter(f => f.name.endsWith('.zip') && f.name.startsWith('storage_backup_'))
            .map(f => ({
                name: f.name,
                created_at: f.created_at,
                metadata: f.metadata
            }))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return NextResponse.json({ backups });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

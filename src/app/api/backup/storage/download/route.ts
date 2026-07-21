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

        const { searchParams } = new URL(req.url);
        const fileName = searchParams.get('file');
        if (!fileName) return NextResponse.json({ error: 'File name required' }, { status: 400 });

        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin.storage.from('backups').createSignedUrl(fileName, 60, { download: true });
        
        if (error || !data) throw error || new Error('Could not generate download link');

        return NextResponse.redirect(data.signedUrl);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

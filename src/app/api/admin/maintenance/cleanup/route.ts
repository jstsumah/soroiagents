import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cleanupOrphanedFiles } from '@/services/maintenance-service';

export const dynamic = 'force-dynamic';

/**
 * API Route to trigger orphaned file cleanup.
 * Restricted to Admins and Super Admins.
 */
export async function POST() {
  console.log('--- CLEANUP API HIT ---');
  const supabase = await createClient();

  // 1. Check Authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Check Role (Strictly Super Admin for this sensitive task)
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (userProfile?.role !== 'Super Admin') {
    return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
  }

  try {
    const result = await cleanupOrphanedFiles();
    
    // Log the event in audit logs if possible
    await supabase.from('audit_logs').insert({
        user_id: session.user.id,
        action: 'CLEANUP_ORPHANS',
        resource_type: 'Storage',
        details: JSON.stringify(result)
    });

    return NextResponse.json({
      message: 'Cleanup task executed successfully',
      result
    });
  } catch (error: any) {
    console.error('Cleanup API error:', error);
    return NextResponse.json({
      error: 'Failed to execute cleanup task',
      details: error.message
    }, { status: 500 });
  }
}

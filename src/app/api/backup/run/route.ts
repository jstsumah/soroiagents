import { NextResponse } from 'next/server';
import { runBackup } from '@/services/backup-service';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/services/audit-log-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.BACKUP_CRON_SECRET;
        let isAuthorized = false;
        let userId = 'system';
        let userName = 'CRON / System';

        if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
            isAuthorized = true;
        } else {
            const supabase = await createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: userProfile } = await supabase.from('profiles').select('role, name').eq('id', session.user.id).single();
                if (userProfile?.role === 'Super Admin') {
                    isAuthorized = true;
                    userId = session.user.id;
                    userName = userProfile.name;
                }
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS) || 30;
        const manifest = await runBackup(retentionDays);

        await logActivity({
            userId,
            userName,
            action: 'backup.run',
            details: { totalRows: manifest.totalRows, timestamp: manifest.timestamp },
            status: 'success'
        });

        return NextResponse.json({ message: 'Backup completed', manifest });
    } catch (error: any) {
        console.error('Backup API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

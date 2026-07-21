import { runBackup } from '@/services/backup-service';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run cron on nodejs runtime
    const cron = await import('node-cron');
    
    // Run at 02:30 AM every day
    // This provides a fallback if GitHub Actions fails or isn't set up
    cron.schedule('30 2 * * *', async () => {
      console.log('Running daily fallback backup via Next.js instrumentation...');
      try {
        const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS) || 30;
        await runBackup(retentionDays);
        console.log('Daily fallback backup completed successfully.');
      } catch (error) {
        console.error('Fallback backup failed:', error);
      }
    });
  }
}

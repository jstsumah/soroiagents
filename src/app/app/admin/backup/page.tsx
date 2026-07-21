import { Metadata } from 'next';
import { BackupClient } from './backup-client';

export const metadata: Metadata = {
  title: 'System Backups | Soroi Agents Portal',
  description: 'Manage and restore system database backups.',
};

export default function BackupPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">System Backups</h2>
      </div>
      <BackupClient />
    </div>
  );
}

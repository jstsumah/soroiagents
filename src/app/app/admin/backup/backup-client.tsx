'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, DatabaseBackup, RotateCcw, AlertTriangle, Download, Upload } from 'lucide-react';
import { BACKUP_TABLES } from '@/services/backup-service';
import type { BackupItem } from '@/services/backup-service';

export function BackupClient() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningBackup, setIsRunningBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [confirmText, setConfirmText] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/backup/list');
      if (!res.ok) throw new Error('Failed to fetch backups');
      const data = await res.json();
      setBackups(data.backups || []);
    } catch (error: any) {
      toast({
        title: 'Error loading backups',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleRunBackup = async () => {
    setIsRunningBackup(true);
    try {
      const res = await fetch('/api/backup/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backup failed');
      
      toast({
        title: 'Backup Completed',
        description: `Successfully backed up ${data.manifest.totalRows} rows.`,
      });
      fetchBackups();
    } catch (error: any) {
      toast({
        title: 'Backup Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRunningBackup(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup || selectedTables.length === 0) return;
    
    setIsRestoring(true);
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupName: selectedBackup,
          tables: selectedTables
        })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Restore failed');
      
      let msg = 'Restore results:\n';
      for (const [table, result] of Object.entries(data.results as Record<string, any>)) {
         msg += `- ${table}: ${result.success ? `Restored ${result.count} rows` : `Failed (${result.error})`}\n`;
      }

      toast({
        title: 'Restore Completed',
        description: <div className="whitespace-pre-line">{msg}</div>,
      });
      setRestoreDialogOpen(false);
      setConfirmText('');
    } catch (error: any) {
      toast({
        title: 'Restore Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/backup/import', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to import backup');

        toast({
            title: 'Backup Imported',
            description: 'Backup archive was successfully imported and is ready to restore.',
        });
        
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchBackups();
    } catch (error: any) {
        toast({
            title: 'Import Error',
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setIsImporting(false);
    }
  };

  const handleDownload = (backupName: string) => {
    window.location.href = `/api/backup/download?name=${encodeURIComponent(backupName)}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <input 
              type="file" 
              accept=".zip" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleImport} 
          />
          <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting || isLoading}
          >
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isImporting ? 'Importing...' : 'Import Backup (.zip)'}
          </Button>
        </div>
        <Button onClick={handleRunBackup} disabled={isRunningBackup || isLoading}>
          {isRunningBackup ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <DatabaseBackup className="mr-2 h-4 w-4" />
          )}
          Run Backup Now
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Tables Backed Up</TableHead>
              <TableHead>Total Rows</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : backups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No backups found.
                </TableCell>
              </TableRow>
            ) : (
              backups.map((backup) => (
                <TableRow key={backup.name}>
                  <TableCell className="font-medium">
                    {new Date(backup.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {backup.manifest?.tableStats.filter(s => s.success).length || 0} / {BACKUP_TABLES.length}
                  </TableCell>
                  <TableCell>
                    {backup.manifest?.totalRows.toLocaleString() || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    {formatBytes(backup.sizeBytes)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => handleDownload(backup.name)}
                        title="Download ZIP Archive"
                        >
                        <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                            setSelectedBackup(backup.name);
                            setSelectedTables(BACKUP_TABLES);
                            setConfirmText('');
                            setRestoreDialogOpen(true);
                        }}
                        >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Restore
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restore from Backup</DialogTitle>
            <DialogDescription>
              Select the tables you want to restore. This will overwrite existing records with the same ID.
              <div className="mt-2 text-red-500 flex items-center text-sm font-medium">
                <AlertTriangle className="mr-1 h-4 w-4" /> Use with extreme caution on production!
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Checkbox 
                id="select-all" 
                checked={selectedTables.length === BACKUP_TABLES.length}
                onCheckedChange={(checked) => {
                  if (checked) setSelectedTables(BACKUP_TABLES);
                  else setSelectedTables([]);
                }}
              />
              <label htmlFor="select-all" className="text-sm font-medium leading-none">
                Select All Tables
              </label>
            </div>
            
            {BACKUP_TABLES.map(table => (
              <div key={table} className="flex items-center space-x-2">
                <Checkbox 
                  id={`table-${table}`} 
                  checked={selectedTables.includes(table)}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedTables([...selectedTables, table]);
                    else setSelectedTables(selectedTables.filter(t => t !== table));
                  }}
                />
                <label htmlFor={`table-${table}`} className="text-sm leading-none">
                  {table}
                </label>
              </div>
            ))}
          </div>

          <div className="pt-2">
              <label className="text-sm font-medium">Type <span className="font-bold text-red-600">RESTORE</span> to confirm</label>
              <Input 
                  type="text" 
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="RESTORE"
                  className="mt-1"
              />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)} disabled={isRestoring}>
              Cancel
            </Button>
            <Button onClick={handleRestore} disabled={isRestoring || selectedTables.length === 0 || confirmText !== 'RESTORE'} variant="destructive">
              {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

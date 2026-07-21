import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const BACKUP_TABLES = [
  'auth_users',
  'profiles',
  'companies',
  'resources',
  'rates',
  'exclusive_deals',
  'properties',
  'packaged_itineraries',
  'park_fees',
  'how_to_get_there_locations',
  'training_resources',
  'settings',
  'email_templates',
  'payments',
  'audit_logs'
];

export interface BackupManifest {
  timestamp: string;
  tableStats: {
    table: string;
    rowCount: number;
    success: boolean;
    error?: string;
  }[];
  totalRows: number;
  sizeBytes?: number;
}

export interface BackupItem {
  name: string;
  timestamp: Date;
  manifest: BackupManifest | null;
  sizeBytes: number;
}

const BUCKET_NAME = 'backups';

async function ensureBucketExists(supabaseAdmin: any) {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) throw listError;

  const exists = buckets.some((b: any) => b.name === BUCKET_NAME);
  if (!exists) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 52428800, // 50MB limit
      allowedMimeTypes: ['application/json']
    });
    if (createError) throw createError;
  }
}

export async function runBackup(retentionDays: number = 30): Promise<BackupManifest> {
  const supabaseAdmin = getSupabaseAdmin();
  await ensureBucketExists(supabaseAdmin);

  const timestamp = new Date().toISOString();
  const folderName = timestamp.replace(/[:.]/g, '-');
  
  const manifest: BackupManifest = {
    timestamp,
    tableStats: [],
    totalRows: 0,
  };

  // Back up each table
  for (const table of BACKUP_TABLES) {
    try {
      let data: any[] | null = null;
      
      if (table === 'auth_users') {
        let allUsers: any[] = [];
        let page = 1;
        while (true) {
            const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
            if (usersError) throw usersError;
            if (!usersData.users || usersData.users.length === 0) break;
            allUsers = [...allUsers, ...usersData.users];
            if (usersData.users.length < 1000) break;
            page++;
        }
        data = allUsers;
      } else {
        const { data: tableData, error } = await supabaseAdmin
          .from(table)
          .select('*')
          .limit(100000); // safety limit
        if (error) throw error;
        data = tableData;
      }

      const rowCount = data?.length || 0;
      const fileData = JSON.stringify(data || []);
      
      const filePath = `${folderName}/${table}.json`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(filePath, fileData, {
          contentType: 'application/json',
          upsert: true
        });

      if (uploadError) throw uploadError;

      manifest.tableStats.push({
        table,
        rowCount,
        success: true
      });
      manifest.totalRows += rowCount;

    } catch (error: any) {
      console.error(`Error backing up table ${table}:`, error);
      manifest.tableStats.push({
        table,
        rowCount: 0,
        success: false,
        error: error.message
      });
    }
  }

  // Upload manifest
  const manifestData = JSON.stringify(manifest, null, 2);
  const manifestSize = Buffer.byteLength(manifestData, 'utf8');
  manifest.sizeBytes = manifestSize; // base size
  
  await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(`${folderName}/manifest.json`, manifestData, {
      contentType: 'application/json',
      upsert: true
    });

  // Cleanup old backups
  await cleanupOldBackups(retentionDays);

  return manifest;
}

export async function cleanupOldBackups(retentionDays: number) {
  const supabaseAdmin = getSupabaseAdmin();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const { data: folders, error: listError } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .list();

  if (listError || !folders) return;

  for (const folder of folders) {
    if (folder.id === null && folder.name) {
      try {
        const { data: manifestData, error: downloadError } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .download(`${folder.name}/manifest.json`);
          
        if (!downloadError && manifestData) {
            const manifestText = await manifestData.text();
            const manifest: BackupManifest = JSON.parse(manifestText);
            const backupDate = new Date(manifest.timestamp);
            
            if (backupDate < cutoffDate) {
                // Delete all files in folder
                const { data: files } = await supabaseAdmin.storage.from(BUCKET_NAME).list(folder.name);
                if (files && files.length > 0) {
                    const pathsToRemove = files.map(f => `${folder.name}/${f.name}`);
                    await supabaseAdmin.storage.from(BUCKET_NAME).remove(pathsToRemove);
                }
            }
        }
      } catch(e) {}
    }
  }
}

export async function listBackups(): Promise<BackupItem[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: folders, error: listError } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .list();

  if (listError || !folders) return [];

  const backups: BackupItem[] = [];

  for (const folder of folders) {
    if (folder.id === null && folder.name) {
      try {
        const { data: manifestData, error: downloadError } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .download(`${folder.name}/manifest.json`);

        let manifest: BackupManifest | null = null;
        let timestamp = new Date(0);

        if (!downloadError && manifestData) {
          const manifestText = await manifestData.text();
          manifest = JSON.parse(manifestText);
          timestamp = new Date(manifest!.timestamp);
        } else {
            const normalizedDateStr = folder.name.replace(/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3}Z)$/, "$1:$2:$3.$4");
            const parsed = new Date(normalizedDateStr);
            if (!isNaN(parsed.getTime())) timestamp = parsed;
        }
        
        let sizeBytes = manifest?.sizeBytes || 0;
        if (!sizeBytes) {
           const { data: files } = await supabaseAdmin.storage.from(BUCKET_NAME).list(folder.name);
           if (files) {
               sizeBytes = files.reduce((acc, f) => acc + (f.metadata?.size || 0), 0);
           }
        }

        backups.push({
          name: folder.name,
          timestamp,
          manifest,
          sizeBytes
        });
      } catch (e) {
        console.error("Error reading backup:", folder.name, e);
      }
    }
  }

  return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export async function restoreBackup(backupName: string, tablesToRestore: string[]) {
    const supabaseAdmin = getSupabaseAdmin();
    const results: Record<string, { success: boolean, count: number, error?: string }> = {};

    for (const table of tablesToRestore) {
        if (!BACKUP_TABLES.includes(table)) {
            results[table] = { success: false, count: 0, error: 'Invalid table name' };
            continue;
        }

        try {
            const filePath = `${backupName}/${table}.json`;
            const { data, error: downloadError } = await supabaseAdmin.storage
                .from(BUCKET_NAME)
                .download(filePath);

            if (downloadError) throw downloadError;

            const fileText = await data.text();
            const rows: any[] = JSON.parse(fileText);

            if (rows.length === 0) {
                results[table] = { success: true, count: 0 };
                continue;
            }

            if (table === 'auth_users') {
                let successCount = 0;
                for (const user of rows) {
                    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
                    if (!existingUser?.user) {
                        const randomPassword = crypto.randomUUID() + 'A1!'; // ensure complexity
                        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
                            id: user.id,
                            email: user.email,
                            phone: user.phone || undefined,
                            user_metadata: user.user_metadata,
                            app_metadata: user.app_metadata,
                            password: randomPassword,
                            email_confirm: true,
                        });
                        
                        if (!createError) successCount++;
                        else console.error(`Failed to restore auth user ${user.email}:`, createError);
                    } else {
                        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
                            user_metadata: user.user_metadata,
                            app_metadata: user.app_metadata
                        });
                        if (!updateError) successCount++;
                    }
                }
                results[table] = { success: true, count: successCount };
                continue;
            }

            const BATCH_SIZE = 1000;
            let successCount = 0;
            
            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                const batch = rows.slice(i, i + BATCH_SIZE);
                const { error: upsertError } = await supabaseAdmin
                    .from(table)
                    .upsert(batch);
                
                if (upsertError) throw upsertError;
                successCount += batch.length;
            }

            results[table] = { success: true, count: successCount };

        } catch (error: any) {
            console.error(`Error restoring table ${table}:`, error);
            results[table] = { success: false, count: 0, error: error.message };
        }
    }

    return results;
}

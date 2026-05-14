const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL: Missing Supabase environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runHealthCheck() {
    console.log('=== SOROI PORTAL SYSTEM HEALTH CHECK ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Target:', supabaseUrl);
    console.log('----------------------------------------');

    const tables = [
        'profiles', 
        'companies', 
        'resources', 
        'rates', 
        'exclusive_deals', 
        'properties', 
        'packaged_itineraries',
        'audit_logs'
    ];

    const results = {};

    // 1. Check Table Counts & Connectivity
    for (const table of tables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            if (error) throw error;
            results[table] = { count, status: 'OK' };
        } catch (err) {
            results[table] = { count: 0, status: 'ERROR', message: err.message };
        }
    }

    console.log('Table Integrity Check:');
    console.table(results);

    // 2. Check for Potential URL Malformations
    console.log('\nURL Integrity Check (Resources):');
    try {
        const { data: resources } = await supabase.from('resources').select('id, title, file_url').limit(100);
        const brokenUrls = resources?.filter(r => !r.file_url || !r.file_url.startsWith('http')) || [];
        if (brokenUrls.length > 0) {
            console.warn(`FOUND ${brokenUrls.length} resources with potentially broken URLs:`);
            brokenUrls.forEach(r => console.log(` - [${r.id}] ${r.title}: ${r.file_url}`));
        } else {
            console.log(' - No malformed URLs found in first 100 resources.');
        }
    } catch (err) {
        console.error(' - Could not check resources:', err.message);
    }

    // 3. Check for Pending Signups
    console.log('\nUser Status Check:');
    try {
        const { count: pendingCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        console.log(` - Pending Approvals: ${pendingCount}`);
    } catch (err) {
        console.error(' - Could not check pending users:', err.message);
    }

    // 4. Audit Log Activity (Last 5 actions)
    console.log('\nRecent Activity (Audit Logs):');
    try {
        const { data: logs } = await supabase
            .from('audit_logs')
            .select('timestamp, action, user_name')
            .order('timestamp', { ascending: false })
            .limit(5);
        
        if (logs && logs.length > 0) {
            logs.forEach(l => console.log(` - [${l.timestamp}] ${l.user_name}: ${l.action}`));
        } else {
            console.log(' - No audit logs found.');
        }
    } catch (err) {
        console.error(' - Could not fetch audit logs:', err.message);
    }

    console.log('\n----------------------------------------');
    console.log('Health Check Completed.');
}

runHealthCheck();

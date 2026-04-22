
import { getSupabaseAdmin } from './src/lib/supabase/admin';

async function testSchema() {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }
    if (data && data.length > 0) {
        console.log('Profile columns:', Object.keys(data[0]));
    } else {
        console.log('No profiles found to check columns.');
    }
}

testSchema();

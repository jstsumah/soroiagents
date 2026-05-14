const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceRoleKey);

async function check() {
    const { data } = await supabase.from('resources').select('file_url').limit(1);
    console.log('EXAMPLE_DB_URL:', data?.[0]?.file_url);
    const { data: { publicUrl } } = supabase.storage.from('soroi').getPublicUrl('test.txt');
    console.log('GENERATED_BASE_URL:', publicUrl.replace('test.txt', ''));
}

check();

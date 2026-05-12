const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const COMPANY_ID = '8c0b75d3-cc6d-4af5-bfa5-c0a412473451';

// Mirrors the phone regex from the form
const phoneRegex = /^\+[1-9]\d{1,14}$/;
const websiteRegex = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

async function check() {
    const { data, error } = await supabase.from('companies').select('*').eq('id', COMPANY_ID).single();
    if (error) { console.error('Error fetching company:', error); return; }
    
    console.log('Company data:\n', JSON.stringify(data, null, 2));

    // Validate each required field
    const issues = [];
    if (!data.name || data.name.trim().length < 3) issues.push(`name: "${data.name}" (min 3 chars)`);
    if (!data.phone || !phoneRegex.test(data.phone)) issues.push(`phone: "${data.phone}" (must be international format, e.g. +254...)`);
    if (data.website_url && !websiteRegex.test(data.website_url)) issues.push(`website_url: "${data.website_url}" (invalid URL)`);
    if (!data.street_address || data.street_address.trim().length < 1) issues.push(`street_address: "${data.street_address}"`);
    if (!data.city || data.city.trim().length < 1) issues.push(`city: "${data.city}"`);
    if (!data.country || data.country.trim().length < 1) issues.push(`country: "${data.country}"`);
    if (!data.company_reg || data.company_reg.trim().length < 1) issues.push(`company_reg: "${data.company_reg}"`);
    
    // The company_reg_doc is required (refine check - not null/undefined)
    if (data.company_reg_doc === null || data.company_reg_doc === undefined) {
        issues.push(`company_reg_doc: null — this is REQUIRED by the form`);
    } else {
        console.log('\ncompany_reg_doc:', JSON.stringify(data.company_reg_doc));
    }

    if (issues.length > 0) {
        console.log('\n⚠️  VALIDATION ISSUES FOUND:');
        issues.forEach(i => console.log('  -', i));
    } else {
        console.log('\n✅ All required fields pass basic validation.');
    }
}

check();

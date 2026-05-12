'use server';

import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { Company } from '@/lib/types';
import { getAuthenticatedUser } from './auth-service';
import { logActivity } from './audit-log-service';
import { ensureHttps } from '@/lib/utils';

import { deleteFile } from './storage-service';

export const importCompanies = async (
    companies: Partial<Company>[]
): Promise<{ successCount: number; updatedCount: number; skippedCount: number; errors: { company: Partial<Company>; error: string }[] }> => {
    const supabaseAdmin = getSupabaseAdmin();
    const errors: { company: Partial<Company>; error: string }[] = [];
    let successCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const toDb = (company: Partial<Company>): Record<string, unknown> => {
        const db: Record<string, unknown> = {};
        if (company.name !== undefined) db.name = company.name;
        if (company.phone !== undefined) db.phone = company.phone;
        if (company.website_url !== undefined) db.website_url = company.website_url ? ensureHttps(company.website_url) : company.website_url;
        if (company.company_reg !== undefined) db.company_reg = company.company_reg;
        if (company.company_reg_doc !== undefined) db.company_reg_doc = company.company_reg_doc;
        if (company.tra_license !== undefined) db.tra_license = company.tra_license;
        if (company.tra_license_doc !== undefined) db.tra_license_doc = company.tra_license_doc;
        if (company.street_address !== undefined) db.street_address = company.street_address;
        if (company.city !== undefined) db.city = company.city;
        if (company.country !== undefined) db.country = company.country;
        if (company.postal_address !== undefined) db.postal_address = company.postal_address;
        if (company.zip_code !== undefined) db.zip_code = company.zip_code;
        if (company.vat_no !== undefined) db.vat_no = company.vat_no;
        if (company.dmc !== undefined) db.dmc = company.dmc;
        return db;
    };

    for (let i = 0; i < companies.length; i++) {
        const company = companies[i];

        if (!company.name || typeof company.name !== 'string' || company.name.trim().length === 0) {
            errors.push({ company, error: 'Company name is required.' });
            continue;
        }

        // Try to find an existing record by Name (Case-insensitive) first
        let { data: existing } = await supabaseAdmin
            .from('companies')
            .select('*')
            .ilike('name', company.name.trim())
            .maybeSingle();

        // If no name match, try unique identifier fields
        if (!existing) {
            const uniqueFields: (keyof Company)[] = ['vat_no', 'company_reg', 'tra_license'];
            for (const field of uniqueFields) {
                const value = company[field];
                if (value && typeof value === 'string' && value.trim().length > 0) {
                    const { data: match } = await supabaseAdmin
                        .from('companies')
                        .select('*')
                        .eq(field, value.trim())
                        .maybeSingle();
                    if (match) {
                        existing = match;
                        break;
                    }
                }
            }
        }

        if (existing) {
            // Case 1: Match found - logic for filling empty info
            const updates: Record<string, any> = {};
            let hasChanges = false;

            const fieldsToUpdate: (keyof Company)[] = [
                'phone', 'website_url', 'company_reg', 'tra_license', 
                'street_address', 'city', 'country', 'postal_address', 
                'zip_code', 'vat_no', 'dmc'
            ];

            for (const key of fieldsToUpdate) {
                const newValue = company[key];
                const existingValue = existing[key];

                // Only update if database value is null/empty AND incoming value is NOT empty
                if ((existingValue === null || existingValue === undefined || String(existingValue).trim() === '') &&
                    (newValue !== undefined && newValue !== null && String(newValue).trim() !== '')) {
                    
                    updates[key] = key === 'website_url' ? ensureHttps(newValue as string) : newValue;
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                const { error: updateError } = await supabaseAdmin
                    .from('companies')
                    .update(updates)
                    .eq('id', existing.id);

                if (updateError) {
                    errors.push({ company, error: `Found existing company "${existing.name}" but update failed: ${updateError.message}` });
                } else {
                    updatedCount++;
                }
            } else {
                skippedCount++;
            }
            continue;
        }

        // Case 2: No match found - Insert new company
        const { data, error } = await supabaseAdmin
            .from('companies')
            .insert(toDb(company))
            .select()
            .single();

        if (error) {
            errors.push({ company, error: error.message });
        } else {
            successCount++;
            try {
                const user = await getAuthenticatedUser();
                if (user) {
                    await logActivity({
                        userId: user.uid,
                        userName: user.name,
                        action: 'company.create',
                        details: { companyId: data.id, companyName: company.name }
                    });
                }
            } catch (e) {
                console.error("Audit log failed for company import:", e);
            }
        }
    }

    return { successCount, updatedCount, skippedCount, errors };
};

const isDuplicateCompany = async (company: Partial<Company>, excludeId?: string): Promise<{ isDuplicate: boolean; field: string; value: string } | null> => {
    const uniqueFields: (keyof Company)[] = ['name', 'phone', 'website_url', 'vat_no', 'company_reg', 'tra_license'];
    const supabase = await createClient();
    
    for (const field of uniqueFields) {
        let value = company[field];
        if (value && typeof value === 'string') {
            value = value.trim();
            if (value === '') continue;

            // Normalize website_url for consistent comparison
            if (field === 'website_url') {
                value = ensureHttps(value);
            }

            let query = supabase
                .from('companies')
                .select('id')
                .eq(field, value);
            
            if (excludeId) {
                query = query.neq('id', excludeId);
            }
            
            const { data, error } = await query.maybeSingle();
            if (data) {
                 return { isDuplicate: true, field, value };
            }
        }
    }
    return null;
}

export const getCompanies = async (): Promise<Company[]> => {
    const supabaseAdmin = getSupabaseAdmin();
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    
    while (true) {
        const { data, error } = await supabaseAdmin
            .from('companies')
            .select('*')
            .range(from, from + step - 1)
            .order('name', { ascending: true });
        
        if (error) {
            console.error('Error fetching companies:', error.message, error.details, error.hint);
            break;
        }
        
        if (!data || data.length === 0) break;
        
        allData = [...allData, ...data];
        if (data.length < step) break;
        from += step;
    }

    return allData.map(mapDbToCompany);
};

export const getCompany = async (id: string): Promise<Company | null> => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error(`Error fetching company ${id}:`, error.message, error.details, error.hint);
        return null;
    }

    return data ? mapDbToCompany(data) : null;
};

export const addCompany = async (data: Omit<Company, 'id'>): Promise<string> => {
    // Normalize before duplicate check
    const normalizedData = { ...data };
    if (normalizedData.website_url) {
        normalizedData.website_url = ensureHttps(normalizedData.website_url);
    }

    const duplicateCheck = await isDuplicateCompany(normalizedData);
    if (duplicateCheck) {
        throw new Error(`This company already exists (duplicate ${duplicateCheck.field.replace('_', ' ')}: "${duplicateCheck.value}"). Please contact support to be linked to this company.`);
    }

    const dbData = mapCompanyToDb(data);
    const supabaseAdmin = getSupabaseAdmin();
    const { data: insertedData, error } = await supabaseAdmin
        .from('companies')
        .insert(dbData)
        .select()
        .single();

    if (error) throw error;

    try {
        const user = await getAuthenticatedUser();
        if(user) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: 'company.create',
                details: { companyId: insertedData.id, companyName: data.name }
            });
        }
    } catch(e) {
        console.error("Audit log failed for company creation:", e);
    }

    return insertedData.id;
};

export const updateCompany = async (id: string, data: Partial<Omit<Company, 'id'>>): Promise<void> => {
    console.log('[updateCompany] called for id=', id);
    const current = await getCompany(id);
    if (!current) throw new Error("Company not found");

    // Only check duplicates for fields that are actually changing
    // This is crucial because the database has pre-existing duplicates that shouldn't block unrelated updates.
    const changedFields: Partial<Company> = {};
    const uniqueFields = ['name', 'phone', 'website_url', 'vat_no', 'company_reg', 'tra_license'];
    
    for (const field of uniqueFields) {
        const key = field as keyof Company;
        let newValue = data[key];
        let currentValue = current[key];

        if (newValue !== undefined) {
            // Normalize for comparison
            const normNew = typeof newValue === 'string' ? newValue.trim() : newValue;
            const normCurrent = typeof currentValue === 'string' ? currentValue.trim() : currentValue;

            // Special case for website_url normalization
            if (key === 'website_url') {
                const finalNew = normNew ? ensureHttps(normNew as string) : normNew;
                const finalCurrent = normCurrent ? ensureHttps(normCurrent as string) : normCurrent;
                if (finalNew !== finalCurrent) {
                    (changedFields as any)[key] = finalNew;
                }
            } else if (normNew !== normCurrent) {
                (changedFields as any)[key] = normNew;
            }
        }
    }

    console.log('[updateCompany] changed unique fields:', changedFields);

    if (Object.keys(changedFields).length > 0) {
        const duplicateCheck = await isDuplicateCompany(changedFields, id);
        if (duplicateCheck) {
            throw new Error(`Another company with the same ${duplicateCheck.field.replace('_', ' ')} already exists: "${duplicateCheck.value}".`);
        }
    }

    console.log('[updateCompany] Executing DB update...');
    const dbData = mapCompanyToDb(data);
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('companies')
        .update(dbData)
        .eq('id', id);

    if (error) {
        console.error('[updateCompany] DB error:', error);
        throw error;
    }
    console.log('[updateCompany] DB update success for id=', id);

    try {
        const user = await getAuthenticatedUser();
        if(user) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: 'company.update',
                details: { companyId: id, companyName: data.name || current.name }
            });
        }
    } catch(e) {
        console.error("Audit log failed for company update:", e);
    }
};


export const deleteCompany = async (id: string): Promise<void> => {
    const companyData = await getCompany(id);
    if (!companyData) return;

    const supabaseAdmin = getSupabaseAdmin();

    // First, clear company_id references in profiles (foreign key constraint)
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ company_id: null })
        .eq('company_id', id);

    if (profileError) throw profileError;

    // Delete associated documents
    if (companyData.company_reg_doc?.url) {
        await deleteFile(companyData.company_reg_doc.url).catch(e => console.error('Error deleting company_reg_doc:', e));
    }
    if (companyData.tra_license_doc?.url) {
        await deleteFile(companyData.tra_license_doc.url).catch(e => console.error('Error deleting tra_license_doc:', e));
    }
    if (companyData.signed_contracts) {
        for (const contract of companyData.signed_contracts) {
            if (contract.url) {
                await deleteFile(contract.url).catch(e => console.error('Error deleting signed_contract:', e));
            }
        }
    }

    const { error } = await supabaseAdmin
        .from('companies')
        .delete()
        .eq('id', id);

    if (error) throw error;

    try {
        const user = await getAuthenticatedUser();
        if(user && companyData) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: 'company.delete',
                details: { companyId: id, companyName: companyData.name }
            });
        }
    } catch(e) {
        console.error("Audit log failed for company deletion:", e);
    }
};

export const deleteCompanies = async (ids: string[]): Promise<void> => {
    const supabaseAdmin = getSupabaseAdmin();

    // First, clear company_id references in profiles (foreign key constraint)
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ company_id: null })
        .in('company_id', ids);

    if (profileError) throw profileError;

    const { error } = await supabaseAdmin
        .from('companies')
        .delete()
        .in('id', ids);

    if (error) throw error;

    try {
        const user = await getAuthenticatedUser();
        if (user) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: 'company.delete',
                details: { companyIds: ids, count: ids.length }
            });
        }
    } catch (e) {
        console.error("Audit log failed for bulk company deletion:", e);
    }
};

const mapDbToCompany = (db: any): Company => ({
    id: db.id,
    name: db.name,
    phone: db.phone,
    website_url: db.website_url,
    company_reg: db.company_reg,
    company_reg_doc: db.company_reg_doc,
    tra_license: db.tra_license,
    tra_license_doc: db.tra_license_doc,
    street_address: db.street_address,
    city: db.city,
    country: db.country,
    postal_address: db.postal_address,
    zip_code: db.zip_code,
    vat_no: db.vat_no,
    signed_contracts: db.signed_contracts || [],
    dmc: db.dmc
});

const mapCompanyToDb = (company: Partial<Company>): any => {
    const db: any = {};
    if (company.name !== undefined) db.name = company.name;
    if (company.phone !== undefined) db.phone = company.phone;
    if (company.website_url !== undefined) db.website_url = company.website_url ? ensureHttps(company.website_url) : company.website_url;
    if (company.company_reg !== undefined) db.company_reg = company.company_reg;
    if (company.company_reg_doc !== undefined) db.company_reg_doc = company.company_reg_doc;
    if (company.tra_license !== undefined) db.tra_license = company.tra_license;
    if (company.tra_license_doc !== undefined) db.tra_license_doc = company.tra_license_doc;
    if (company.street_address !== undefined) db.street_address = company.street_address;
    if (company.city !== undefined) db.city = company.city;
    if (company.country !== undefined) db.country = company.country;
    if (company.postal_address !== undefined) db.postal_address = company.postal_address;
    if (company.zip_code !== undefined) db.zip_code = company.zip_code;
    if (company.vat_no !== undefined) db.vat_no = company.vat_no;
    if (company.signed_contracts !== undefined) db.signed_contracts = company.signed_contracts;
    if (company.dmc !== undefined) db.dmc = company.dmc;
    return db;
};

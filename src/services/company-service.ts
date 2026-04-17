'use server';

import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { Company } from '@/lib/types';
import { getAuthenticatedUser } from './auth-service';
import { logActivity } from './audit-log-service';

import { deleteFile, uploadFile } from './storage-service';

const isDuplicateCompany = async (company: Partial<Company>, excludeId?: string): Promise<{ isDuplicate: boolean; field: string; value: string } | null> => {
    const uniqueFields: (keyof Company)[] = ['name', 'phone', 'website_url', 'vat_no', 'company_reg', 'tra_license'];
    const supabase = await createClient();
    
    for (const field of uniqueFields) {
        const value = company[field];
        if (value && typeof value === 'string') {
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
    const duplicateCheck = await isDuplicateCompany(data);
    if (duplicateCheck) {
        throw new Error(`A company with the same ${duplicateCheck.field.replace('_', ' ')} already exists: "${duplicateCheck.value}".`);
    }

    const dbData = mapCompanyToDb(data);
    const supabase = await createClient();
    const { data: insertedData, error } = await supabase
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
    const duplicateCheck = await isDuplicateCompany(data, id);
    if (duplicateCheck) {
        throw new Error(`Another company with the same ${duplicateCheck.field.replace('_', ' ')} already exists: "${duplicateCheck.value}".`);
    }

    const dbData = mapCompanyToDb(data);
    const supabase = await createClient();
    const { error } = await supabase
        .from('companies')
        .update(dbData)
        .eq('id', id);

    if (error) throw error;

    try {
        const user = await getAuthenticatedUser();
        if(user) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: 'company.update',
                details: { companyId: id, companyName: data.name || 'Unknown' }
            });
        }
    } catch(e) {
        console.error("Audit log failed for company update:", e);
    }
};

export const deleteCompany = async (id: string): Promise<void> => {
    const companyData = await getCompany(id);
    if (!companyData) return;

    const supabase = await createClient();

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

    const { error } = await supabase
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
    if (company.website_url !== undefined) db.website_url = company.website_url;
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

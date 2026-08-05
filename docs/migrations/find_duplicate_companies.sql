-- ============================================================
-- DUPLICATE COMPANY ANALYSIS SCRIPT
-- Soroi Agents Portal — Production Database
-- 
-- ✅ READ-ONLY: This script makes NO changes to your data.
--    All queries are SELECT only. Safe to run on production.
--
-- HOW TO USE:
--   1. Run each section independently in the Supabase SQL Editor.
--   2. Review the results to decide which companies to merge/delete.
--   3. Once you know your merge targets, share them with your developer
--      to apply the actual data changes safely.
-- ============================================================


-- ============================================================
-- SECTION 1: Duplicates by SIMILAR NAME (case-insensitive)
-- These are companies that match exactly when lowercased.
-- Highest priority to fix — likely the same company.
-- ============================================================
SELECT
    lower(name)                         AS normalized_name,
    COUNT(*)                            AS duplicate_count,
    array_agg(id ORDER BY created_at)   AS company_ids,
    array_agg(name ORDER BY created_at) AS company_names,
    array_agg(created_at ORDER BY created_at) AS created_dates
FROM companies
GROUP BY lower(name)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, normalized_name;


-- ============================================================
-- SECTION 2: Duplicates by PHONE NUMBER
-- Companies sharing the same phone are almost certainly the same.
-- ============================================================
SELECT
    phone,
    COUNT(*)                            AS duplicate_count,
    array_agg(id ORDER BY created_at)   AS company_ids,
    array_agg(name ORDER BY created_at) AS company_names
FROM companies
WHERE phone IS NOT NULL AND trim(phone) != ''
GROUP BY phone
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, phone;


-- ============================================================
-- SECTION 3: Duplicates by WEBSITE URL
-- ============================================================
SELECT
    lower(website_url)                  AS normalized_url,
    COUNT(*)                            AS duplicate_count,
    array_agg(id ORDER BY created_at)   AS company_ids,
    array_agg(name ORDER BY created_at) AS company_names
FROM companies
WHERE website_url IS NOT NULL AND trim(website_url) != ''
GROUP BY lower(website_url)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, normalized_url;


-- ============================================================
-- SECTION 4: Duplicates by COMPANY REGISTRATION NUMBER
-- ============================================================
SELECT
    company_reg,
    COUNT(*)                            AS duplicate_count,
    array_agg(id ORDER BY created_at)   AS company_ids,
    array_agg(name ORDER BY created_at) AS company_names
FROM companies
WHERE company_reg IS NOT NULL AND trim(company_reg) != ''
GROUP BY company_reg
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;


-- ============================================================
-- SECTION 5: Duplicates by VAT NUMBER
-- ============================================================
SELECT
    vat_no,
    COUNT(*)                            AS duplicate_count,
    array_agg(id ORDER BY created_at)   AS company_ids,
    array_agg(name ORDER BY created_at) AS company_names
FROM companies
WHERE vat_no IS NOT NULL AND trim(vat_no) != ''
GROUP BY vat_no
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;


-- ============================================================
-- SECTION 6: FULL DETAIL VIEW — Duplicate Name Groups
-- For each group of name-matched duplicates, shows all fields
-- side by side so you can pick which record to KEEP.
-- ============================================================
SELECT
    c.id,
    c.name,
    c.phone,
    c.website_url,
    c.company_reg,
    c.vat_no,
    c.street_address,
    c.city,
    c.country,
    c.created_at,
    (SELECT COUNT(*) FROM profiles p WHERE p.company_id = c.id) AS linked_user_count,
    jsonb_array_length(COALESCE(c.signed_contracts, '[]'::jsonb)) AS signed_contract_count
FROM companies c
WHERE lower(c.name) IN (
    SELECT lower(name)
    FROM companies
    GROUP BY lower(name)
    HAVING COUNT(*) > 1
)
ORDER BY lower(c.name), c.created_at;


-- ============================================================
-- SECTION 7: USERS AFFECTED by duplicate companies
-- For each duplicate company group, shows which users
-- would need to be re-linked if you delete the duplicate.
-- ============================================================
SELECT
    p.id                    AS user_id,
    p.name                  AS user_name,
    p.email                 AS user_email,
    p.status                AS user_status,
    p.tier                  AS user_tier,
    c.id                    AS company_id,
    c.name                  AS company_name,
    c.created_at            AS company_created_at
FROM profiles p
JOIN companies c ON p.company_id = c.id
WHERE lower(c.name) IN (
    SELECT lower(name)
    FROM companies
    GROUP BY lower(name)
    HAVING COUNT(*) > 1
)
ORDER BY lower(c.name), p.name;


-- ============================================================
-- SECTION 8: ORPHANED AUTO-CREATED COMPANIES
-- These are companies with ONLY a name (no phone, no address, 
-- no country) and few users — likely auto-created at signup
-- and never properly filled in. Good candidates to merge.
-- ============================================================
SELECT
    c.id,
    c.name,
    c.created_at,
    (SELECT COUNT(*) FROM profiles p WHERE p.company_id = c.id) AS linked_user_count
FROM companies c
WHERE
    (c.phone IS NULL OR trim(c.phone) = '')
    AND (c.website_url IS NULL OR trim(c.website_url) = '')
    AND (c.street_address IS NULL OR trim(c.street_address) = '')
    AND (c.country IS NULL OR trim(c.country) = '')
    AND (c.company_reg IS NULL OR trim(c.company_reg) = '')
ORDER BY linked_user_count ASC, c.created_at ASC;

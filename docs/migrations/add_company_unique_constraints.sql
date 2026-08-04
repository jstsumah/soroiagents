-- ============================================================
-- Migration: Add Unique Constraints to Companies Table
-- Date: 2026-08-04
-- Purpose: Prevent duplicate company records at the database level.
--
-- IMPORTANT: Run this AFTER cleaning up existing duplicates.
-- Existing duplicate phone/website_url records will cause this 
-- migration to fail unless removed first.
--
-- To identify existing duplicates before running, execute:
--   SELECT phone, COUNT(*) FROM companies 
--   WHERE phone IS NOT NULL AND phone != '' 
--   GROUP BY phone HAVING COUNT(*) > 1;
--
--   SELECT website_url, COUNT(*) FROM companies 
--   WHERE website_url IS NOT NULL AND website_url != '' 
--   GROUP BY website_url HAVING COUNT(*) > 1;
-- ============================================================


-- ── Step 1: Partial Unique Index on phone ──────────────────
-- Only enforces uniqueness when phone is not null/empty.
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_phone_unique
    ON companies (phone)
    WHERE phone IS NOT NULL AND phone != '';


-- ── Step 2: Partial Unique Index on website_url ────────────
-- Normalized URLs are stored (ensureHttps), so comparison is consistent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_website_url_unique
    ON companies (website_url)
    WHERE website_url IS NOT NULL AND website_url != '';


-- ── Step 3: Case-Insensitive Unique Index on name ─────────
-- Uses lower() to enforce case-insensitive uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_name_unique_ci
    ON companies (lower(name));


-- ── Step 4: Optional - Unique on company_reg where not empty ─
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_company_reg_unique
    ON companies (company_reg)
    WHERE company_reg IS NOT NULL AND company_reg != '';


-- ── Step 5: Optional - Unique on vat_no where not empty ────
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_vat_no_unique
    ON companies (vat_no)
    WHERE vat_no IS NOT NULL AND vat_no != '';

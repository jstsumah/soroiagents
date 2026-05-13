-- Supabase Database Schema for Soroi Agents Portal (Version 2.0 - Production Grade)

-- ==========================================
-- 0. Extensions & Helper Functions
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to automatically update 'updated_at' columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 1. Companies Table
-- ==========================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    website_url TEXT,
    company_reg TEXT,
    company_reg_doc JSONB, -- { name, url, uploaded_at }
    tra_license TEXT,
    tra_license_doc JSONB,
    street_address TEXT,
    city TEXT,
    country TEXT,
    postal_address TEXT,
    zip_code TEXT,
    vat_no TEXT,
    signed_contracts JSONB DEFAULT '[]'::jsonb,
    dmc TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Companies
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_vat_no ON companies(vat_no);

-- Trigger for Companies
DROP TRIGGER IF EXISTS tr_companies_updated_at ON companies;
CREATE TRIGGER tr_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 2. Profiles Table (Extends auth.users)
-- ==========================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    tier TEXT DEFAULT 'Brass',
    status TEXT DEFAULT 'pending',
    role TEXT DEFAULT 'Agent',
    type TEXT DEFAULT 'international',
    company_id UUID REFERENCES companies(id),
    phone TEXT,
    payment_terms TEXT,
    remarks TEXT,
    dmc TEXT,
    country TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    can_view_users BOOLEAN DEFAULT FALSE,
    has_all_tier_access BOOLEAN DEFAULT FALSE,
    password_reset_required BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_status CHECK (status IN ('active', 'inactive', 'pending')),
    CONSTRAINT check_role CHECK (role IN ('Admin', 'Agent', 'Super Admin')),
    CONSTRAINT check_type CHECK (type IN ('local', 'international'))
);

-- Indexes for Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Trigger for Profiles
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON profiles;
CREATE TRIGGER tr_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 3. Resources Table
-- ==========================================
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    tier_access TEXT[] DEFAULT '{}',
    file_url TEXT NOT NULL,
    image_url TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Resources
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_tier_access ON resources USING GIN (tier_access);

-- Trigger for Resources
DROP TRIGGER IF EXISTS tr_resources_updated_at ON resources;
CREATE TRIGGER tr_resources_updated_at
    BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 4. Rates Table
-- ==========================================
CREATE TABLE IF NOT EXISTS rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    tier_access TEXT[] DEFAULT '{}',
    user_type_access TEXT[] DEFAULT '{}',
    file_url TEXT,
    image_url TEXT NOT NULL,
    is_nett BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Rates
CREATE INDEX IF NOT EXISTS idx_rates_tier_access ON rates USING GIN (tier_access);
CREATE INDEX IF NOT EXISTS idx_rates_user_type_access ON rates USING GIN (user_type_access);

-- Trigger for Rates
DROP TRIGGER IF EXISTS tr_rates_updated_at ON rates;
CREATE TRIGGER tr_rates_updated_at
    BEFORE UPDATE ON rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 5. Exclusive Deals Table
-- ==========================================
CREATE TABLE IF NOT EXISTS exclusive_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    tier_access TEXT[] DEFAULT '{}',
    user_type_access TEXT[] DEFAULT '{}',
    file_url TEXT NOT NULL,
    image_url TEXT NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    featured BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Exclusive Deals
CREATE INDEX IF NOT EXISTS idx_exclusive_deals_featured ON exclusive_deals(featured);
CREATE INDEX IF NOT EXISTS idx_exclusive_deals_valid_until ON exclusive_deals(valid_until);

-- Trigger for Exclusive Deals
DROP TRIGGER IF EXISTS tr_exclusive_deals_updated_at ON exclusive_deals;
CREATE TRIGGER tr_exclusive_deals_updated_at
    BEFORE UPDATE ON exclusive_deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 6. Properties Table
-- ==========================================
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    images TEXT[] DEFAULT '{}',
    total_rooms INTEGER DEFAULT 0,
    room_types JSONB DEFAULT '[]'::jsonb,
    facilities TEXT[] DEFAULT '{}',
    amenities TEXT[] DEFAULT '{}',
    activities TEXT[] DEFAULT '{}',
    wetu_ibrochure_url TEXT,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Properties
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(featured);

-- Trigger for Properties
DROP TRIGGER IF EXISTS tr_properties_updated_at ON properties;
CREATE TRIGGER tr_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 7. Packaged Itineraries Table
-- ==========================================
CREATE TABLE IF NOT EXISTS packaged_itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    commission_info TEXT,
    description TEXT,
    notes TEXT,
    packages JSONB DEFAULT '[]'::jsonb,
    tier_access TEXT[] DEFAULT '{}',
    user_type_access TEXT[] DEFAULT '{}',
    featured BOOLEAN DEFAULT FALSE,
    is_net_package BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Itineraries
CREATE INDEX IF NOT EXISTS idx_itineraries_featured ON packaged_itineraries(featured);

-- Trigger for Itineraries
DROP TRIGGER IF EXISTS tr_itineraries_updated_at ON packaged_itineraries;
CREATE TRIGGER tr_itineraries_updated_at
    BEFORE UPDATE ON packaged_itineraries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 8. Park Fees Table
-- ==========================================
CREATE TABLE IF NOT EXISTS park_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location TEXT NOT NULL,
    fees JSONB DEFAULT '[]'::jsonb,
    note TEXT,
    user_type TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for Park Fees
DROP TRIGGER IF EXISTS tr_park_fees_updated_at ON park_fees;
CREATE TRIGGER tr_park_fees_updated_at
    BEFORE UPDATE ON park_fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 9. How To Get There Locations Table
-- ==========================================
CREATE TABLE IF NOT EXISTS how_to_get_there_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    map_url TEXT,
    flights JSONB DEFAULT '[]'::jsonb,
    trains JSONB DEFAULT '[]'::jsonb,
    roads JSONB DEFAULT '[]'::jsonb,
    tier_access TEXT[] DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for Locations
DROP TRIGGER IF EXISTS tr_how_to_get_there_updated_at ON how_to_get_there_locations;
CREATE TRIGGER tr_how_to_get_there_updated_at
    BEFORE UPDATE ON how_to_get_there_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 10. Training Resources Table
-- ==========================================
CREATE TABLE IF NOT EXISTS training_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    tier_access TEXT[] DEFAULT '{}',
    file_url TEXT,
    external_link TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for Training
DROP TRIGGER IF EXISTS tr_training_resources_updated_at ON training_resources;
CREATE TRIGGER tr_training_resources_updated_at
    BEFORE UPDATE ON training_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 11. Settings Table
-- ==========================================
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for Settings
DROP TRIGGER IF EXISTS tr_settings_updated_at ON settings;
CREATE TRIGGER tr_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 12. Payments Table
-- ==========================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    amount NUMERIC NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for Payments
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

-- ==========================================
-- 13. Audit Logs Table
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- ==========================================
-- 14. Chat Sessions Table
-- ==========================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 15. Chat Messages Table
-- ==========================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT,
    author_uid UUID,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index for Chat Messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- ==========================================
-- 16. Email Templates Table
-- ==========================================
CREATE TABLE IF NOT EXISTS email_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    placeholders TEXT[] DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Row Level Security (RLS) Configuration
-- ==========================================

-- Function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('Admin', 'Super Admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END $$;

-- ------------------------------------------
-- Policies: Profiles
-- ------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles FOR ALL USING (public.is_admin());

-- ------------------------------------------
-- Policies: Companies
-- ------------------------------------------
DROP POLICY IF EXISTS "Auth users can view companies" ON companies;
CREATE POLICY "Auth users can view companies" ON companies FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage companies" ON companies;
CREATE POLICY "Admins can manage companies" ON companies FOR ALL USING (public.is_admin());

-- ------------------------------------------
-- Policies: Tiered Content (Resources, Rates, etc.)
-- ------------------------------------------
-- Helper to check tiered access
CREATE OR REPLACE FUNCTION public.has_tiered_access(tier_access TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        tier_access = '{}' 
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (tier = ANY(tier_access) OR has_all_tier_access = TRUE)
        )
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Resources
DROP POLICY IF EXISTS "Tiered view resources" ON resources;
CREATE POLICY "Tiered view resources" ON resources FOR SELECT USING (public.has_tiered_access(tier_access));
CREATE POLICY "Admins manage resources" ON resources FOR ALL USING (public.is_admin());

-- Rates
DROP POLICY IF EXISTS "Tiered view rates" ON rates;
CREATE POLICY "Tiered view rates" ON rates FOR SELECT USING (public.has_tiered_access(tier_access));
CREATE POLICY "Admins manage rates" ON rates FOR ALL USING (public.is_admin());

-- Exclusive Deals
DROP POLICY IF EXISTS "Tiered view deals" ON exclusive_deals;
CREATE POLICY "Tiered view deals" ON exclusive_deals FOR SELECT USING (public.has_tiered_access(tier_access));
CREATE POLICY "Admins manage deals" ON exclusive_deals FOR ALL USING (public.is_admin());

-- Itineraries
DROP POLICY IF EXISTS "Tiered view itineraries" ON packaged_itineraries;
CREATE POLICY "Tiered view itineraries" ON packaged_itineraries FOR SELECT USING (public.has_tiered_access(tier_access));
CREATE POLICY "Admins manage itineraries" ON packaged_itineraries FOR ALL USING (public.is_admin());

-- Training
DROP POLICY IF EXISTS "Tiered view training" ON training_resources;
CREATE POLICY "Tiered view training" ON training_resources FOR SELECT USING (public.has_tiered_access(tier_access));
CREATE POLICY "Admins manage training" ON training_resources FOR ALL USING (public.is_admin());

-- ------------------------------------------
-- Policies: Public/Authenticated Access
-- ------------------------------------------
CREATE POLICY "Auth users view properties" ON properties FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage properties" ON properties FOR ALL USING (public.is_admin());

CREATE POLICY "Auth users view park fees" ON park_fees FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage park fees" ON park_fees FOR ALL USING (public.is_admin());

CREATE POLICY "Auth users view locations" ON how_to_get_there_locations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage locations" ON how_to_get_there_locations FOR ALL USING (public.is_admin());

CREATE POLICY "Auth users view settings" ON settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage settings" ON settings FOR ALL USING (public.is_admin());

-- ------------------------------------------
-- Policies: System Tables (Logs, Chat, Email)
-- ------------------------------------------
CREATE POLICY "Admins view audit logs" ON audit_logs FOR SELECT USING (public.is_admin());

CREATE POLICY "Users manage own chat sessions" ON chat_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all chat sessions" ON chat_sessions FOR ALL USING (public.is_admin());

CREATE POLICY "Users manage own chat messages" ON chat_messages FOR ALL USING (
    EXISTS (SELECT 1 FROM chat_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Admins manage all chat messages" ON chat_messages FOR ALL USING (public.is_admin());

CREATE POLICY "Admins manage email templates" ON email_templates FOR ALL USING (public.is_admin());
CREATE POLICY "Auth users view email templates" ON email_templates FOR SELECT USING (auth.role() = 'authenticated');

-- ==========================================
-- Auth Trigger: Create Profile on Signup
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, role, status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'Agent'),
        'pending'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- Initial Data Seeding (Idempotent)
-- ==========================================

-- Seed Email Templates
INSERT INTO email_templates (id, name, subject, body, placeholders)
VALUES 
('user.activated', 'User Activated', 'Welcome to {{companyName}}!', '<h1>Welcome, {{userName}}!</h1><p>Your account for the {{companyName}} Agent Portal has been activated.</p><p>You can now log in to access exclusive resources, rates, and deals available to you.</p><p>If you have any questions, please don''t hesitate to contact us.</p><br/><p>Best regards,</p><p>The {{companyName}} Team</p>', ARRAY['userName', 'userEmail', 'companyName']),
('password.reset', 'Password Reset', 'Your Password Reset Link for {{companyName}}', '<h1>Password Reset Request</h1><p>Hello {{userName}},</p><p>We received a request to reset the password for your account. Click the link below to set a new password:</p><p><a href="{{resetLink}}">Reset Your Password</a></p><p>If you did not request a password reset, please ignore this email.</p><br/><p>Best regards,</p><p>The {{companyName}} Team</p>', ARRAY['userName', 'userEmail', 'companyName', 'resetLink']),
('user.signup.admin_notification', 'Admin: New User Signup', 'New User Registration on {{companyName}} Portal', '<h1>New User Alert</h1><p>A new user has registered on the agent portal and is awaiting approval.</p><ul><li><strong>Name:</strong> {{newUserName}}</li><li><strong>Email:</strong> {{newUserEmail}}</li><li><strong>Company:</strong> {{newUserCompany}}</li></ul><p>Please log in to the admin dashboard to review and activate their account.</p>', ARRAY['newUserName', 'newUserEmail', 'newUserCompany', 'companyName'])
ON CONFLICT (id) DO NOTHING;

-- Seed Default Settings
INSERT INTO settings (key, value)
VALUES 
('brandTheme', '{"primary": "#7B6A58", "background": "#E9E8E7", "accent": "#B68D6A"}'::jsonb),
('companyDetails', '{"companyName": "Soroi Agents Portal", "contactEmail": "support@example.com", "contactPhone": "+1 234 567 890"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- Storage Configuration (Optional - Requires Superuser for full automation)
-- ==========================================
-- Note: Buckets and policies are often managed via the Supabase Dashboard,
-- but they can be initialized here.
INSERT INTO storage.buckets (id, name, public)
VALUES ('soroi', 'soroi', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'soroi' bucket
DO $$
BEGIN
    -- Public Read
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'soroi');
    END IF;
    
    -- Authenticated Upload (Managed via Service Role in app, but policy added for completeness)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Upload' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'soroi' AND auth.role() = 'authenticated');
    END IF;
END $$;

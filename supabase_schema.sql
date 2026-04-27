-- Supabase Database Schema for Soroi Agents Portal

-- 1. Companies Table
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles Table (Extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Resources Table
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tier_access TEXT[] DEFAULT '{}',
  file_url TEXT NOT NULL,
  image_url TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Rates Table
CREATE TABLE IF NOT EXISTS rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  tier_access TEXT[] DEFAULT '{}',
  user_type_access TEXT[] DEFAULT '{}',
  file_url TEXT,
  image_url TEXT NOT NULL,
  is_nett BOOLEAN DEFAULT FALSE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Exclusive Deals Table
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
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Properties Table
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Packaged Itineraries Table
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
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Park Fees Table
CREATE TABLE IF NOT EXISTS park_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL,
  fees JSONB DEFAULT '[]'::jsonb,
  note TEXT,
  user_type TEXT NOT NULL
);

-- 9. How To Get There Locations Table
CREATE TABLE IF NOT EXISTS how_to_get_there_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  map_url TEXT,
  flights JSONB DEFAULT '[]'::jsonb,
  trains JSONB DEFAULT '[]'::jsonb,
  roads JSONB DEFAULT '[]'::jsonb,
  tier_access TEXT[] DEFAULT '{}'
);

-- 10. Training Resources Table
CREATE TABLE IF NOT EXISTS training_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  tier_access TEXT[] DEFAULT '{}',
  file_url TEXT,
  external_link TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  amount NUMERIC NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT,
  author_uid UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  placeholders TEXT[] DEFAULT '{}'
);

-- Row Level Security (RLS) Configuration

-- Function to check if the current user is an admin (bypasses RLS to avoid recursion)
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
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exclusive_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaged_itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE park_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE how_to_get_there_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Basic Policies

-- Profiles: Users can read their own profile, Admins can read all
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (public.is_admin());

-- Companies: Authenticated users can read, Admins can manage
CREATE POLICY "Auth users can view companies" ON companies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage companies" ON companies FOR ALL USING (public.is_admin());

-- Resources, Rates, Deals, etc.: Authenticated users can read, Admins can manage
CREATE POLICY "Auth users can view resources" ON resources FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage resources" ON resources FOR ALL USING (public.is_admin());

CREATE POLICY "Auth users can view rates" ON rates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage rates" ON rates FOR ALL USING (public.is_admin());

CREATE POLICY "Auth users can view deals" ON exclusive_deals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage deals" ON exclusive_deals FOR ALL USING (public.is_admin());

CREATE POLICY "Auth users can view properties" ON properties FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage properties" ON properties FOR ALL USING (public.is_admin());

CREATE POLICY "Auth users can view itineraries" ON packaged_itineraries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage itineraries" ON packaged_itineraries FOR ALL USING (public.is_admin());

CREATE POLICY "Auth users can view park fees" ON park_fees FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage park fees" ON park_fees FOR ALL USING (public.is_admin());

CREATE POLICY "Auth users can view locations" ON how_to_get_there_locations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage locations" ON how_to_get_there_locations FOR ALL USING (public.is_admin());

CREATE POLICY "Auth users can view training" ON training_resources FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage training" ON training_resources FOR ALL USING (public.is_admin());

-- Settings: Authenticated users can read, Admins can manage
CREATE POLICY "Auth users can view settings" ON settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage settings" ON settings FOR ALL USING (public.is_admin());

-- Audit Logs: Admins can read all, System can insert via service_role (bypasses RLS)
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (public.is_admin());

-- Chat: Users can manage their own sessions, Admins can manage all
CREATE POLICY "Users can manage own chat sessions" ON chat_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all chat sessions" ON chat_sessions FOR ALL USING (public.is_admin());

CREATE POLICY "Users can manage own chat messages" ON chat_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM chat_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage all chat messages" ON chat_messages FOR ALL USING (public.is_admin());

-- Email Templates: Admins can manage
CREATE POLICY "Admins can manage email templates" ON email_templates FOR ALL USING (public.is_admin());
CREATE POLICY "Auth users can view email templates" ON email_templates FOR SELECT USING (auth.role() = 'authenticated');

-- Function to handle new user registration and create profile
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

-- Trigger for new user
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

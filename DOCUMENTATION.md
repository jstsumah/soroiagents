# Technical Documentation - Soroi Agents Portal v2.0

## 1. Architecture Overview

The application is built as a modern full-stack web application using **Next.js 15** and **Supabase**. It follows a service-oriented architecture for the backend logic, utilizing Next.js Server Actions for secure database communication.

### Core Components:
- **Frontend**: React components styled with vanilla CSS, utilizing CSS variables for dynamic branding and theming.
- **Backend**: Next.js Server Actions interacting with Supabase via the `supabase-js` client.
- **Database**: PostgreSQL (Supabase) with Row Level Security (RLS) enforcing data privacy.
- **AI Integration**: Google Genkit for support chat and metadata generation.
- **Storage**: Supabase Storage for resources, company documents, and brand assets.

## 2. Database & Security (Supabase)

### Row Level Security (RLS)
Security is enforced at the database level. Each table has specific policies:
- **Tiered Access**: Resources (Rates, Deals, etc.) are filtered by a custom PostgreSQL function `has_tiered_access()` which checks the user's `tier` against the resource's `tier_access` array.
- **Admin Bypass**: Admins and Super Admins bypass tiered filters via the `is_admin()` function.
- **User Privacy**: Users can only view and update their own profiles.

### Key Tables:
- `profiles`: Extends `auth.users`, storing role, tier, and status.
- `companies`: Centralized company profiles linked to users.
- `resources/rates/exclusive_deals`: Tier-restricted content.
- `audit_logs`: Immutable records of administrative actions.
- `settings`: Key-value JSON store for system configuration.

## 3. Service Layer

Logic is encapsulated in `src/services/` to maintain clean separation from the UI:
- `auth-service.ts`: Handles authentication state and authorization checks.
- `user-service.ts`: Manages user profiles, approvals, and legacy login fallbacks.
- `company-service.ts`: Handles company profile management and duplicate prevention.
- `settings-service.ts`: Manages global configurations, themes, and branding.
- `audit-log-service.ts`: Provides a secure way to record system activities.

## 4. AI & Chatbot

The portal features a **Support Chatbot** powered by **Google Genkit**.
- **Chat Sessions**: Managed in `chat_sessions` and `chat_messages` tables.
- **Admin Integration**: Admins can view active sessions and join conversations to provide live support.
- **AI Metadata**: When uploading resources, an AI tool analyzes file content/context to suggest optimal categorization and descriptions.

## 5. Branding & Theming

The application supports dynamic branding without code changes:
- **CSS Variables**: Themes are applied via `--brand-primary`, `--brand-background`, etc.
- **Settings Store**: Branding assets (logos, background images) and colors are stored in the `settings` table and applied globally via a root layout provider.

## 6. Deployment & Maintenance

### Environment Variables Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_GENAI_API_KEY`
- `MAILERSEND_API_KEY` (for email services)

### Migrations:
Database changes should be applied via the `supabase_schema.sql` script. It is designed to be idempotent for safe application on existing environments.

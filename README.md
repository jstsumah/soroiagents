# Soroi Agents Portal v2.0

A premium, production-grade agent resource portal built with Next.js 15, Supabase, and Genkit. This application provides tiered access to exclusive travel resources, rates, itineraries, and property information for Soroi Agents.

## 🚀 Key Features

- **Tiered Access Control**: Role-based access (Admin, Agent, Super Admin) with granular tiering (Brass, Gold, Platinum, etc.) enforced via Supabase RLS.
- **Unified Resource Hub**: Centralized access to Rates, Exclusive Deals, Packaged Itineraries, and multi-category Downloads.
- **AI-Powered Assistance**:
  - **Support Chatbot**: Integrated AI assistant to help agents navigate the portal.
  - **Metadata Suggester**: AI-driven metadata generation for resource uploads.
- **Centralized Company Management**: Robust profile management for travel agencies with document verification and duplicate prevention.
- **Support System**: Live chat interface connecting agents with administrators.
- **Production-Grade Audit Logs**: Comprehensive tracking of all administrative actions for security and accountability.
- **Modern UI/UX**: Premium, responsive design with dynamic themes and glassmorphism elements.

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Actions)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Styling**: Vanilla CSS with CSS Variables for dynamic branding
- **AI Layer**: [Google Genkit](https://firebase.google.com/docs/genkit)
- **Components**: Radix UI & Lucide Icons
- **Forms**: React Hook Form with Zod validation

## 🚦 Getting Started

### Prerequisites

- Node.js 20+
- A Supabase Project
- A Google AI Studio API Key (for Genkit features)

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd soroi-agents-portal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file based on `.env.example`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GOOGLE_GENAI_API_KEY=your_google_ai_key
   ```

4. Initialize Database:
   Execute the contents of `supabase_schema.sql` in your Supabase SQL Editor.

5. Run the development server:
   ```bash
   npm run dev
   ```

## 📄 Documentation

- [Technical Documentation](./DOCUMENTATION.md) - Architecture and implementation details.
- [User Manual](./USER_MANUAL.md) - Guide for Agents and Admins.
- [Database Schema](./supabase_schema.sql) - Full SQL schema definition.

## ⚖️ License

Proprietary. All rights reserved.

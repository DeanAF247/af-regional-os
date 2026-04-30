# AF Regional OS — Setup Guide

## Prerequisites
- Node.js 18+ installed → https://nodejs.org
- A Supabase account → https://supabase.com (free tier)
- A Vercel account → https://vercel.com (free tier)

---

## Step 1: Install Dependencies

Open a terminal in this folder and run:

```bash
npm install
```

---

## Step 2: Set Up Supabase

1. Go to https://supabase.com and create a new project
2. Once created, go to **SQL Editor** in the left sidebar
3. Open `supabase/migrations/001_initial_schema.sql` and paste the entire contents into the SQL Editor
4. Click **Run** — this creates the core tables and seeds the 6 clubs
5. Open `supabase/migrations/002_add_missing_tables.sql` and paste the entire contents into the SQL Editor
6. Click **Run** — this adds the membership, scores, yield, and transfers tables

Then get your API keys:
- Go to **Settings → API**
- Copy your **Project URL** and **anon/public** key

---

## Step 3: Configure Environment Variables

Create a `.env.local` file in this folder:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Step 4: Create Your Login Account

In Supabase:
1. Go to **Authentication → Users**
2. Click **Add User → Create New User**
3. Enter your email and password
4. That's your login for the app

---

## Step 5: Run Locally

```bash
npm run dev
```

Open http://localhost:3000 — you'll see the login page.

---

## Step 6: Deploy to Vercel

1. Push this folder to a GitHub repository
2. Go to https://vercel.com → New Project → Import from GitHub
3. Add your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click Deploy

---

## Club Slug Mapping

The URL slugs for clubs are:
- Greenhills → `/clubs/greenhills`
- Thornton → `/clubs/thornton`
- Newcastle West → `/clubs/newcastle-west`
- Kotara → `/clubs/kotara`
- Edgeworth → `/clubs/edgeworth`
- Lake Haven → `/clubs/lake-haven`

---

## Uploading KPI Data

1. Log in and click **Upload KPIs** on the dashboard
2. Select the month and year
3. Enter figures for each club: Leads, Sales, NNM, CPL, Spend, Budget
4. Click **Save KPIs**

The dashboard and charts update instantly.

---

## Adding a New Club

1. Run this SQL in Supabase SQL Editor:
```sql
INSERT INTO clubs (name, location, status)
VALUES ('New Club Name', 'Location', 'active');
```
2. Update the `CLUB_SLUGS` mappings in:
   - `app/(dashboard)/page.tsx`
   - `app/(dashboard)/clubs/page.tsx`
   - `components/sidebar.tsx`
3. Add the slug to `SLUG_TO_NAME` in `app/(dashboard)/clubs/[clubId]/page.tsx`

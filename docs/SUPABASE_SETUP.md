# Supabase Authentication Setup Guide

This document provides complete instructions for setting up and connecting **Supabase Authentication** with your DeepRAG Lab application.

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and log in or create a free account.
2. Click **New Project** on your dashboard.
3. Fill out the project details:
   - **Name**: `DeepRAG-Lab` (or your project name)
   - **Database Password**: Set a strong password (save it securely).
   - **Region**: Choose a region closest to your user base.
   - **Pricing Plan**: Free tier is sufficient.
4. Click **Create new project** and wait 1–2 minutes for setup completion.

---

## 2. Obtain Your Supabase Credentials

1. In your Supabase Project Dashboard, click the **Project Settings** (gear icon) at the bottom of the left sidebar.
2. Select **API** under Project Settings.
3. Locate the following keys:
   - **Project URL**: `https://<project-ref>.supabase.co`
   - **Project API Keys** -> `anon` / `public`: `eyJhbGciOi...`

---

## 3. Configure Local Environment Variables

In your frontend root directory (`DeepRAG_Lab_Production_Starter`), create a file named `.env.local`:

```env
# Supabase Authentication Keys
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# FastAPI Backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> **Note**: You can also use `.env.local.example` in the project root as a reference template.

---

## 4. Configure Authentication Providers in Supabase Dashboard

1. In Supabase Dashboard, click **Authentication** (user icon) in the left sidebar.
2. Go to **Providers**:
   - Ensure **Email** is **Enabled**.
3. Go to **URL Configuration**:
   - Set **Site URL** to `http://localhost:3000` (or your production web URL).
   - Add `http://localhost:3000/**` under **Redirect URLs**.
4. *(Optional for instant local testing)*:
   - Go to **Providers** -> **Email**.
   - You can disable **Confirm Email** during local development if you prefer instant sign-in upon account creation without clicking an email verification link.

---

## 5. Verification & Testing

1. Start your Next.js application:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000/login` or `http://localhost:3000/register`.
3. You will see the badge **Supabase Auth Enabled**.
4. Create a new user account on `/register` and log in on `/login`.
5. Check your Supabase Dashboard under **Authentication** -> **Users** to view registered users in real-time.

---

## Troubleshooting

- **Error: "Invalid API key"**: Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` contains the complete `anon` key from Supabase settings.
- **Error: "Unable to connect to backend server"**: If Supabase keys are not set, the app will fall back to FastAPI backend auth (`http://localhost:8000`). Start the backend or set Supabase keys in `.env.local`.

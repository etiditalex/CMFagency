# Vercel Deployment - Environment Variables Setup

## Required Environment Variables

Your Vercel deployment is failing because the following environment variables need to be configured in your Vercel project settings.

### 1. Supabase Configuration (Required)

These are **REQUIRED** for authentication to work:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**How to get these values:**
1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Resend Email Configuration (Optional but Recommended)

These are **OPTIONAL** but recommended for email verification to work:

```
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=CMF Agency <onboarding@resend.dev>
```

**How to get these values:**
1. Sign up at https://resend.com (free tier available)
2. Go to **API Keys**: https://resend.com/api-keys
3. Create a new API key
4. Copy the key (starts with `re_`)
5. For `RESEND_FROM_EMAIL`, you can use:
   - `CMF Agency <onboarding@resend.dev>` (for testing)
   - Or verify your own domain in Resend for production

## How to Add Environment Variables in Vercel

### Step 1: Go to Your Vercel Project
1. Log in to https://vercel.com
2. Select your project (CMFagency or CMFAgency)

### Step 2: Navigate to Settings
1. Click on your project
2. Go to **Settings** tab
3. Click on **Environment Variables** in the left sidebar

### Step 3: Add Each Variable
For each environment variable:

1. Click **Add New**
2. Enter the **Name** (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
3. Enter the **Value** (your actual value)
4. Select the **Environments**:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Click **Save**

### Step 4: Redeploy
After adding all environment variables:

1. Go to the **Deployments** tab
2. Click the **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger a new deployment

## Quick Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` added to Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` added to Vercel
- [ ] `RESEND_API_KEY` added to Vercel (optional)
- [ ] `RESEND_FROM_EMAIL` added to Vercel (optional)
- [ ] All variables set for Production, Preview, and Development
- [ ] Redeployed the project

## Troubleshooting

### Build Still Failing?

1. **Check Vercel Build Logs**
   - Go to your deployment in Vercel
   - Click on the failed deployment
   - Check the build logs for specific errors

2. **Verify Environment Variables**
   - Make sure variable names are EXACT (case-sensitive)
   - Make sure there are no extra spaces
   - Make sure values are correct

3. **Common Issues**
   - Missing `NEXT_PUBLIC_` prefix for client-side variables
   - Wrong Supabase URL or key
   - Resend API key not valid (if using email)

### Still Need Help?

Check the build logs in Vercel for the specific error message and share it for further assistance.


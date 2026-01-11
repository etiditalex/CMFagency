# Environment Variables Setup for Track Application

## Error: "Database connection not configured"

This error occurs when the required Supabase environment variables are not set.

## Quick Fix

### Step 1: Create/Update `.env.local` file

Create a `.env.local` file in the root of your project (same directory as `package.json`) with the following:

```env
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 2: Get Your Supabase Credentials

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy the following values:

   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
     - Example: `https://xxxxxxxxxxxxx.supabase.co`
   
   - **anon public** key → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - This is the public key (safe to expose)
   
   - **service_role** key (secret) → Use for `SUPABASE_SERVICE_ROLE_KEY`
     - ⚠️ **KEEP THIS SECRET!** Never commit it to GitHub
     - This is the secret key with admin privileges

### Step 3: Update `.env.local`

Replace the placeholder values with your actual Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Restart Development Server

After updating `.env.local`:

1. Stop your development server (Ctrl+C)
2. Start it again:
   ```bash
   npm run dev
   ```

### Step 5: Verify Setup

The error should be resolved. If you still see the error:

1. Check that `.env.local` is in the root directory
2. Verify the variable names are exactly as shown (case-sensitive)
3. Make sure there are no extra spaces or quotes around the values
4. Restart your development server

## For Vercel Deployment

If deploying to Vercel, add these same environment variables in:

1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable for **Production**, **Preview**, and **Development** environments

## Required Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Supabase service role key (for admin operations) |

## Troubleshooting

### Still getting the error?

1. **Check file location**: `.env.local` must be in the project root (same folder as `package.json`)
2. **Check variable names**: They must match exactly (case-sensitive)
3. **No quotes needed**: Don't wrap values in quotes unless they contain spaces
4. **Restart server**: Environment variables are only loaded when the server starts
5. **Check console**: Look for "Missing Supabase environment variables" in your terminal

### Example `.env.local` file structure:

```
CMFAgency/
├── .env.local          ← Create this file here
├── package.json
├── app/
├── components/
└── ...
```

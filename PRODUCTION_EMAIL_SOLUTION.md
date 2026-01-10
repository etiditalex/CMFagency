# Production Email Solution - Simple & Works on Vercel

## The Problem
- Resend requires domain verification to send to any email
- Current setup only works for one email address
- Need a solution that works for ALL users in production

## The Solution: Use Supabase SMTP with Gmail

Supabase supports custom SMTP, and Gmail SMTP works without domain verification. This is the **simplest solution** that will work immediately.

## Setup Instructions

### Step 1: Enable Gmail App Password

1. Go to your Google Account: https://myaccount.google.com
2. Go to **Security** → **2-Step Verification** (enable if not already)
3. Go to **App Passwords**: https://myaccount.google.com/apppasswords
4. Create a new app password:
   - Select "Mail" and "Other (Custom name)"
   - Name it: "CMF Agency Supabase"
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### Step 2: Configure Supabase SMTP

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **Settings** → **Auth** → **SMTP Settings**
3. Enable "Custom SMTP"
4. Enter these settings:
   - **Host**: `smtp.gmail.com`
   - **Port**: `587`
   - **Username**: `changerfusions@gmail.com` (your Gmail)
   - **Password**: `[Your 16-character app password]` (from Step 1)
   - **Sender email**: `changerfusions@gmail.com`
   - **Sender name**: `CMF Agency`
5. Click "Save"

### Step 3: Update Code to Use Supabase Email

We'll modify the code to use Supabase's email sending instead of Resend API.

### Step 4: Add Environment Variables to Vercel

In Vercel dashboard → Settings → Environment Variables, add:
- `NEXT_PUBLIC_SUPABASE_URL` (already there)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (already there)
- `SUPABASE_SERVICE_ROLE_KEY` (already there)

**No Resend API key needed!**

## Benefits

✅ **Works immediately** - No domain verification needed
✅ **Sends to any email** - Gmail SMTP works for all recipients
✅ **Simple setup** - Just configure SMTP in Supabase
✅ **Works on Vercel** - No additional configuration needed
✅ **Free** - Gmail SMTP is free (up to 500 emails/day)

## Alternative: Keep Resend but Make Email Optional

If you prefer to keep Resend, we can make email verification optional for now:
- Users can register and access application immediately
- Email verification becomes optional
- Add full verification later when domain is verified

Let me know which approach you prefer!



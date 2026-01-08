# Supabase Email Verification Setup Guide

This guide will help you set up Supabase for email verification in the CMF Agency application.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A Supabase project created

## Step 1: Create a Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in your project details:
   - Name: CMF Agency (or your preferred name)
   - Database Password: Create a strong password
   - Region: Choose the closest region to your users
4. Click "Create new project" and wait for it to be set up

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (this is your `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public** key (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## Step 3: Configure Environment Variables

1. Create a `.env.local` file in the root of your project (if it doesn't exist)
2. Add the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace `your_project_url_here` and `your_anon_key_here` with the values from Step 2.

## Step 4: Configure Email Templates (Optional but Recommended)

1. In your Supabase project, go to **Authentication** → **Email Templates**
2. Customize the "Confirm signup" template to include the verification code
3. You can use the following variables in your template:
   - `{{ .Token }}` - The verification token
   - `{{ .SiteURL }}` - Your site URL
   - `{{ .Email }}` - User's email

### Example Email Template

```
Subject: Verify your CMF Agency account

Hi there!

Thank you for registering with CMF Agency. Please verify your email address by clicking the link below:

{{ .ConfirmationURL }}

Or enter this verification code: [This will be sent separately via our system]

If you didn't create an account, please ignore this email.

Best regards,
CMF Agency Team
```

## Step 5: Enable Email Confirmation

1. Go to **Authentication** → **Settings**
2. Under "Email Auth", make sure:
   - "Enable email confirmations" is **ON**
   - "Secure email change" is **ON** (optional but recommended)

## Step 6: Configure Email Provider

1. Go to **Settings** → **Auth**
2. Under "SMTP Settings", you can:
   - Use Supabase's default email service (limited to development)
   - Configure a custom SMTP provider (recommended for production):
     - Gmail SMTP
     - SendGrid
     - AWS SES
     - Mailgun
     - Or any other SMTP provider

### Using Custom SMTP (Production)

1. Get SMTP credentials from your email provider
2. In Supabase, go to **Settings** → **Auth** → **SMTP Settings**
3. Enable "Custom SMTP"
4. Enter your SMTP details:
   - Host
   - Port
   - Username
   - Password
   - Sender email
   - Sender name

## Step 7: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to `/login`
3. Click "Sign Up / Register"
4. Fill in the registration form
5. Check your email for the verification code
6. Go to `/verify-email` and enter the code
7. You should be redirected to the application page upon successful verification

## How It Works

1. **Registration**: When a user registers, Supabase creates an account and sends a confirmation email. Our system also generates a 6-digit verification code that's stored locally.

2. **Email Verification**: The user receives:
   - A confirmation email from Supabase (with a confirmation link)
   - A verification code stored in the system (currently stored in localStorage for development)

3. **Code Verification**: The user enters the 6-digit code on the `/verify-email` page, which:
   - Validates the code
   - Confirms the email in Supabase
   - Logs the user in automatically

## Production Considerations

For production, you should:

1. **Store verification codes in a database** instead of localStorage
2. **Set up a proper email service** (SendGrid, AWS SES, etc.)
3. **Implement rate limiting** for verification code requests
4. **Add expiration times** for verification codes (currently 10 minutes)
5. **Use Supabase Edge Functions** to send verification codes via email
6. **Implement proper error handling** and logging

## Troubleshooting

### Email not received
- Check spam/junk folder
- Verify SMTP settings in Supabase
- Check Supabase logs for email delivery errors
- Ensure email confirmation is enabled in Auth settings

### Verification code not working
- Check that the code hasn't expired (10 minutes)
- Verify the code matches what was generated
- Check browser console for errors
- Ensure localStorage is enabled in the browser

### "Email not confirmed" error
- User needs to verify their email before logging in
- Direct them to `/verify-email` page
- They can request a new code if needed

## Support

For more information, refer to:
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)



# Email Verification Setup Guide

This guide explains how to set up email sending for verification codes.

## Current Implementation

The verification system:
1. ✅ Generates a 6-digit verification code
2. ✅ Stores the code in localStorage (for immediate access)
3. ✅ Displays the code on the verification page
4. ✅ Attempts to send email via Resend API (if configured)
5. ✅ Auto-logs in users after registration
6. ✅ Redirects to application page immediately

## Option 1: Using Resend (Recommended - Free Tier Available)

### Step 1: Sign up for Resend
1. Go to https://resend.com
2. Sign up for a free account (100 emails/day free)
3. Verify your email

### Step 2: Get Your API Key
1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Give it a name (e.g., "CMF Agency Verification")
4. Copy the API key

### Step 3: Verify Your Domain (Optional but Recommended)
1. Go to https://resend.com/domains
2. Add your domain (e.g., cmfagency.com)
3. Add the required DNS records
4. Wait for verification

### Step 4: Configure Environment Variables
Add to your `.env.local` file:

```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=CMF Agency <noreply@yourdomain.com>
```

Or use Resend's default domain for testing:
```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=CMF Agency <onboarding@resend.dev>
```

### Step 5: Restart Your Server
```bash
npm run dev
```

## Option 2: Using Supabase Email Templates

### Step 1: Configure Supabase Email Templates
1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **Authentication** → **Email Templates**
3. Edit the "Confirm signup" template
4. Add the verification code to the template

**Note:** Supabase email templates don't easily support custom variables like verification codes. You may need to use Supabase Edge Functions instead.

## Option 3: Using Supabase Edge Functions

### Step 1: Create Edge Function
1. Install Supabase CLI: `npm install -g supabase`
2. Initialize Supabase: `supabase init`
3. Create function: `supabase functions new send-verification-email`
4. Implement email sending in the function
5. Deploy: `supabase functions deploy send-verification-email`

### Step 2: Update API Route
Modify `app/api/send-verification-email/route.ts` to call the Edge Function instead of Resend.

## Option 4: Using Other Email Services

You can integrate with:
- **SendGrid** (free tier: 100 emails/day)
- **AWS SES** (pay-as-you-go)
- **Mailgun** (free tier: 5,000 emails/month)
- **Postmark** (free tier: 100 emails/month)

Update `app/api/send-verification-email/route.ts` with your chosen service's API.

## Testing Without Email Service

Even without an email service configured:
- ✅ Users can still register
- ✅ Verification code is displayed on the verification page
- ✅ Users can copy the code and verify
- ✅ Users can access the application page immediately

The code is always available on `/verify-email` page for testing.

## Current Flow

1. **Registration:**
   - User fills registration form
   - System generates 6-digit code
   - Code stored in localStorage
   - Email sent (if Resend configured)
   - User auto-logged in
   - Redirected to `/application`

2. **Application Page:**
   - User can immediately start filling application
   - Banner shows if email not verified
   - Link to verification page available

3. **Verification:**
   - User can verify email anytime
   - Code visible on verification page
   - Code also sent via email (if configured)
   - After verification, banner disappears

## Troubleshooting

### Email not received
1. Check spam/junk folder
2. Verify Resend API key is correct
3. Check Resend dashboard for delivery status
4. Verify `RESEND_FROM_EMAIL` is correct
5. Check browser console for errors

### Code not visible on verification page
1. Check browser localStorage
2. Ensure you're using the same email used for registration
3. Check browser console for errors

### Registration succeeds but no redirect
1. Check browser console for errors
2. Verify Supabase credentials in `.env.local`
3. Check network tab for failed API calls

## Production Recommendations

1. **Use a proper email service** (Resend, SendGrid, etc.)
2. **Store verification codes in database** instead of localStorage
3. **Implement rate limiting** for code requests
4. **Add expiration times** (currently 10 minutes)
5. **Set up proper error logging**
6. **Monitor email delivery rates**

## Support

For issues or questions:
- Check Resend documentation: https://resend.com/docs
- Check Supabase documentation: https://supabase.com/docs
- Review API route: `app/api/send-verification-email/route.ts`





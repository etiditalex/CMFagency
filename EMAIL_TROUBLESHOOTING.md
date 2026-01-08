# Email Verification Troubleshooting Guide

If you're not receiving verification codes via email, follow these steps:

## Step 1: Check Vercel Environment Variables

1. Go to your Vercel project: https://vercel.com
2. Navigate to **Settings** → **Environment Variables**
3. Verify these variables are set:
   - `RESEND_API_KEY` - Should start with `re_`
   - `RESEND_FROM_EMAIL` - Should be `CMF Agency <onboarding@resend.dev>` or your verified domain

## Step 2: Check Vercel Function Logs

1. Go to your Vercel project → **Deployments**
2. Click on the latest deployment
3. Go to **Functions** tab
4. Click on `api/send-verification-email`
5. Check the **Logs** tab for any errors

**Look for:**
- ✅ `Email sent successfully via Resend` - Email was sent
- ❌ `Resend API error` - API error (check the error message)
- ❌ `RESEND_API_KEY not configured` - Missing API key

## Step 3: Check Resend Dashboard

1. Go to https://resend.com/emails
2. Check if emails are being sent
3. Look for:
   - **Status**: Delivered, Bounced, or Failed
   - **Recipient**: The email address you're testing with
   - **Error messages**: If any emails failed

## Step 4: Common Issues & Solutions

### Issue 1: "RESEND_API_KEY not configured"
**Solution:**
- Make sure the environment variable is set in Vercel
- Variable name must be exactly: `RESEND_API_KEY`
- Value must start with `re_`
- Redeploy after adding the variable

### Issue 2: "Invalid API Key" or "Unauthorized"
**Solution:**
- Verify your Resend API key is correct
- Check if the API key is active in Resend dashboard
- Generate a new API key if needed

### Issue 3: "Domain not verified"
**Solution:**
- If using `onboarding@resend.dev`, this should work automatically
- If using your own domain, verify it in Resend dashboard
- Check DNS records are correct

### Issue 4: Emails going to Spam
**Solution:**
- Check spam/junk folder
- Add `onboarding@resend.dev` to your contacts
- For production, verify your own domain in Resend

### Issue 5: Rate Limit Exceeded
**Solution:**
- Free tier: 100 emails/day
- Check your Resend dashboard for usage
- Wait 24 hours or upgrade your plan

## Step 5: Test the API Directly

You can test if the API is working by checking the browser console:

1. Open your browser's Developer Tools (F12)
2. Go to the **Console** tab
3. Register a new account
4. Look for these messages:
   - `Verification email sent successfully to: [email]` ✅
   - `Failed to send verification email: [error]` ❌

## Step 6: Verify Resend Account Status

1. Go to https://resend.com
2. Check your account status
3. Verify:
   - Account is active
   - API key is valid
   - No account restrictions

## Step 7: Check Email Address

- Make sure you're using a valid email address
- Try a different email address (Gmail, Outlook, etc.)
- Check if the email domain is blocking emails

## Still Not Working?

If emails still aren't being received:

1. **Check Vercel Function Logs** - Look for specific error messages
2. **Check Resend Dashboard** - See if emails are being sent
3. **Test with a different email** - Rule out email-specific issues
4. **Verify API key** - Make sure it's correct and active

## Alternative: Check Verification Code on Page

Even if email fails, the verification code is stored in localStorage. You can:
1. Open browser Developer Tools (F12)
2. Go to **Application** → **Local Storage**
3. Look for `verification_code_[your-email]`
4. The code will be there (though this is not recommended for production)

## Need More Help?

Share the following information:
1. Error message from Vercel logs
2. Resend dashboard status
3. Browser console errors
4. Email address you're testing with



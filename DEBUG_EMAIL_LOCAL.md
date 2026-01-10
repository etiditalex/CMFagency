# Debugging Email Issues Locally

## Step 1: Restart Dev Server
**IMPORTANT**: After adding/updating `.env.local`, you MUST restart the dev server:

1. Stop the current dev server (Ctrl+C in terminal)
2. Start it again: `npm run dev`

Environment variables are only loaded when the server starts!

## Step 2: Test Email Configuration
Open this URL in your browser (replace with your email):
```
http://localhost:3000/api/test-email?email=your-email@example.com
```

This will:
- Check if `RESEND_API_KEY` is loaded
- Test the Resend API connection
- Send a test email

**What to look for:**
- If you see `"success": true` → Email should be sent
- If you see an error → Check the error message

## Step 3: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try registering a new account
4. Look for:
   - `"Verification email sent successfully to: ..."`
   - Any error messages

## Step 4: Check Terminal/Server Logs
Look in your terminal where `npm run dev` is running for:
- `"Attempting to send email:"` - Shows if API key is loaded
- `"Email sent successfully via Resend:"` - Success message
- `"Resend API error response:"` - Error details

## Step 5: Verify Resend API Key
1. Go to https://resend.com/api-keys
2. Make sure your API key is active
3. The key should start with `re_`

## Step 6: Check Email Address
- Check your **spam/junk folder**
- Make sure you're using a real email address (not a test domain)
- Some email providers block emails from `onboarding@resend.dev`

## Step 7: Common Issues

### Issue: "RESEND_API_KEY not configured"
**Solution**: 
- Make sure `.env.local` exists in the project root
- Restart dev server after adding env vars
- Check that the key starts with `re_`

### Issue: "Invalid API key" or 401 error
**Solution**:
- Verify the API key at https://resend.com/api-keys
- Make sure you copied the full key (no spaces)
- Generate a new key if needed

### Issue: "Domain not verified"
**Solution**:
- The default `onboarding@resend.dev` should work for testing
- For production, verify your domain in Resend dashboard

### Issue: Email sent but not received
**Solution**:
- Check spam folder
- Wait a few minutes (can take 1-2 minutes)
- Try a different email provider (Gmail, Outlook, etc.)
- Check Resend dashboard for delivery status

## Step 8: Check Resend Dashboard
1. Go to https://resend.com/emails
2. Check if emails are being sent
3. Look for delivery status and any errors

## Still Not Working?
Share these details:
1. What you see in browser console
2. What appears in terminal logs
3. Response from `/api/test-email` endpoint
4. Any error messages



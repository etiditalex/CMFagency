# Email Verification Flow - Complete Check

## Simple Flow:
1. User registers → Code generated → Email sent → User redirected to verification page
2. User enters code → Code verified → Email confirmed in Supabase → User redirected to application

## Testing Steps:

### Step 1: Check Environment Variables
Make sure `.env.local` has:
```
RESEND_API_KEY=re_9HNjZdEJ_7mmPB3Ei2Nz9rAUGASA668AK
RESEND_FROM_EMAIL=CMF Agency <onboarding@resend.dev>
```

### Step 2: Restart Dev Server
**CRITICAL**: After any `.env.local` changes, restart:
```bash
# Stop server (Ctrl+C)
npm run dev
```

### Step 3: Test Email API Directly
Open in browser:
```
http://localhost:3000/api/test-email?email=your-email@example.com
```

Expected response:
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "emailId": "...",
  "to": "your-email@example.com"
}
```

### Step 4: Test Full Registration Flow
1. Go to http://localhost:3000/login
2. Click "Sign Up / Register"
3. Fill in:
   - Name: Test User
   - Email: your-real-email@example.com (use a real email you can check)
   - Password: test1234
4. Click "Create Account"

**Watch Terminal** for:
- `📧 Attempt 1/3: Sending verification email to ...`
- `✅ Email sent successfully! ID: ...`

**Watch Browser Console** (F12) for:
- `Sending verification email to: ...`
- `✅ Verification email sent successfully to: ...`

### Step 5: Check Your Email
- Check inbox (wait 10-30 seconds)
- Check spam/junk folder
- Email subject: "Verify Your Email - CMF Agency"
- Email contains 6-digit code

### Step 6: Verify Code
1. Go to verification page (should auto-redirect)
2. Enter the 6-digit code from email
3. Click "Verify Email"

## Troubleshooting:

### Issue: "RESEND_API_KEY not configured"
**Fix**: 
- Check `.env.local` exists
- Restart dev server
- Verify key starts with `re_`

### Issue: "Failed to send email" in terminal
**Check**:
- Resend API key is valid at https://resend.com/api-keys
- Email address is valid
- Check terminal for detailed error

### Issue: Email not received
**Check**:
- Spam folder
- Wait 1-2 minutes
- Try different email provider
- Check Resend dashboard: https://resend.com/emails

### Issue: Code doesn't work
**Check**:
- Code hasn't expired (10 minutes)
- Entered all 6 digits correctly
- Check browser console for errors

## What Changed:
1. ✅ Simplified email sending (removed complex timeout logic)
2. ✅ Better error logging with emojis for visibility
3. ✅ Retry logic (3 attempts) for reliability
4. ✅ Clearer user messages
5. ✅ Better console logging for debugging

## Next Steps:
1. Restart dev server
2. Test with `/api/test-email` endpoint
3. Try full registration flow
4. Check terminal and browser console for logs
5. Verify email arrives



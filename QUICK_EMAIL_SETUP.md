# Quick Email Setup - Get Verification Codes Sent to Email

## Step 1: Sign Up for Resend (Free - 100 emails/day)

1. Go to **https://resend.com**
2. Click "Sign Up" (free account)
3. Verify your email address

## Step 2: Get Your API Key

1. After logging in, go to **https://resend.com/api-keys**
2. Click **"Create API Key"**
3. Name it: "CMF Agency Verification"
4. Copy the API key (starts with `re_`)

## Step 3: Add to Environment Variables

Open your `.env.local` file and add:

```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=CMF Agency <onboarding@resend.dev>
```

**Note:** For testing, you can use `onboarding@resend.dev`. For production, verify your own domain in Resend.

## Step 4: Restart Your Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

## Step 5: Test It!

1. Register a new account
2. Check your email inbox
3. You should receive an email with the 6-digit verification code

## That's It! ✅

Now verification codes will be sent directly to users' email addresses automatically.

---

## Troubleshooting

### Email not received?
1. **Check spam/junk folder** - Sometimes emails go there first
2. **Verify API key** - Make sure it's correct in `.env.local`
3. **Check Resend dashboard** - Go to https://resend.com/emails to see delivery status
4. **Restart server** - Environment variables only load on server start

### Still not working?
- Check browser console for errors
- Check server terminal for error messages
- Verify `.env.local` file is in the project root
- Make sure you restarted the server after adding the API key

---

## Alternative: Use Your Own Email Service

If you prefer a different email service, you can modify `app/api/send-verification-email/route.ts` to use:
- SendGrid
- Mailgun  
- AWS SES
- Postmark
- Or any SMTP server

The code structure is already set up - just replace the Resend API call with your preferred service.





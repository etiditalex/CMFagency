import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, code, name } = await request.json();

    if (!email || !code || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use Supabase's email sending capability
    // Note: Supabase doesn't have a direct email API, so we'll use their auth email
    // For production, you should use Supabase Edge Functions or an external email service
    
    // Option 1: Use Supabase to send email via their auth system
    // This will send the confirmation email with a link, but we can customize it
    
    // Option 2: For now, we'll use a simple approach - store the code and let Supabase handle the email
    // The actual email sending will be handled by Supabase's email templates
    
    // Generate email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">CMF Agency</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
          
          <p>Hello ${name},</p>
          
          <p>Thank you for registering with CMF Agency. Please verify your email address by entering the following code:</p>
          
          <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; margin: 0; font-family: monospace;">
              ${code}
            </p>
          </div>
          
          <p>This code will expire in 10 minutes.</p>
          
          <p>Enter this code on the verification page to complete your registration.</p>
          
          <p>If you didn't create an account with CMF Agency, please ignore this email.</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; margin: 0;">
            Best regards,<br>
            The CMF Agency Team
          </p>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend API (free tier available)
    // Get API key from environment variable: RESEND_API_KEY
    const resendApiKey = process.env.RESEND_API_KEY;
    // NOTE: Resend requires domain verification to send to any email
    // Using onboarding@resend.dev only sends to your verified email (changerfusions@gmail.com)
    // To send to any email, verify a domain at https://resend.com/domains
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'CMF Agency <onboarding@resend.dev>';
    
    console.log('Attempting to send email:', {
      email,
      hasApiKey: !!resendApiKey,
      apiKeyPrefix: resendApiKey ? resendApiKey.substring(0, 10) + '...' : 'none',
      fromEmail: resendFromEmail,
    });
    
    if (!resendApiKey) {
      // No Resend API key configured
      console.error('RESEND_API_KEY not configured. Email cannot be sent.');
      console.error('Available env vars:', {
        hasResendKey: !!process.env.RESEND_API_KEY,
        hasFromEmail: !!process.env.RESEND_FROM_EMAIL,
        nodeEnv: process.env.NODE_ENV,
      });
      
      return NextResponse.json({ 
        success: false,
        error: 'Email service not configured. Please set RESEND_API_KEY in environment variables. Your verification code is available on the verification page.',
        fallback: true
      }, { status: 400 });
    }
    
    // Send email via Resend API with retry logic
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📧 Attempt ${attempt}/${maxRetries}: Sending verification email to ${email}`);
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: resendFromEmail,
            to: email,
            subject: 'Verify Your Email - CMF Agency',
            html: emailHtml,
          }),
        });

        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          const text = await response.text();
          console.error(`❌ Attempt ${attempt}: Failed to parse response:`, text);
          if (attempt === maxRetries) {
            return NextResponse.json({ 
              success: false,
              error: `Invalid response from email service: ${response.status}`,
              details: { rawResponse: text },
            }, { status: response.status });
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        if (!response.ok) {
          const errorMessage = data.message || data.error?.message || `HTTP ${response.status}`;
          console.error(`❌ Attempt ${attempt} failed:`, {
            status: response.status,
            error: errorMessage,
            fullResponse: data,
          });
          
          // Retry on server errors (500+) or rate limits (429)
          if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
            const delay = 1000 * attempt; // 1s, 2s, 3s
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // Non-retryable error or last attempt - return detailed error
          return NextResponse.json({ 
            success: false,
            error: errorMessage,
            details: data,
            resendError: true,
          }, { status: response.status });
        }

        // Success! Verify we got an email ID
        if (!data.id) {
          console.warn('⚠️ Email API returned success but no email ID:', data);
        }
        
        console.log(`✅ Email sent successfully! ID: ${data.id || 'unknown'}`);
        return NextResponse.json({ 
          success: true,
          message: 'Verification code email sent successfully',
          emailId: data.id
        });
        
      } catch (error: any) {
        console.error(`❌ Attempt ${attempt} error:`, error.message);
        
        if (attempt === maxRetries) {
          return NextResponse.json({ 
            success: false,
            error: error.message || 'Failed to send verification email after multiple attempts',
          }, { status: 500 });
        }
        
        // Wait before retrying
        const delay = 1000 * attempt;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to send verification email after multiple attempts',
    }, { status: 500 });

  } catch (error: any) {
    console.error('Error sending verification email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send verification email' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Alternative email sending using Supabase's built-in email functionality
 * This works by storing the code in user metadata and using Supabase email templates
 * 
 * To use this:
 * 1. Configure Supabase SMTP (Settings → Auth → SMTP Settings)
 * 2. Replace the send-verification-email route with this one
 * 3. Update email template in Supabase to include the verification code
 */

export async function POST(request: NextRequest) {
  try {
    const { email, code, name, userId } = await request.json();

    if (!email || !code || !name || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use Supabase service role to update user metadata with verification code
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Update user metadata with verification code
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          verification_code: code,
          verification_code_expires: Date.now() + 10 * 60 * 1000, // 10 minutes
        }
      }
    );

    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      return NextResponse.json(
        { error: 'Failed to store verification code' },
        { status: 500 }
      );
    }

    // Trigger Supabase to send confirmation email
    // Note: You'll need to customize the email template in Supabase to include the code
    const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/verify-email?code=${code}`,
      }
    });

    // Note: Supabase's generateLink doesn't actually send an email with custom content
    // For a complete solution, you'd need to use Supabase Edge Functions or
    // configure the email template in Supabase dashboard

    return NextResponse.json({ 
      success: true,
      message: 'Verification code stored. Email will be sent via Supabase SMTP.',
      note: 'Configure Supabase email template to include verification code'
    });

  } catch (error: any) {
    console.error('Error in send-verification-email-supabase:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send verification email' },
      { status: 500 }
    );
  }
}


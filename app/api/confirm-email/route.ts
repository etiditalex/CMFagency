import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This route uses the service role key to confirm emails in Supabase
// It should only be called after our custom verification code is validated
export async function POST(request: NextRequest) {
  try {
    const { email, userId } = await request.json();

    if (!email || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: email and userId' },
        { status: 400 }
      );
    }

    // Use service role key for admin operations
    // Note: This should be set in Vercel environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase service role key');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Confirm the email in Supabase
    // This sets email_confirmed_at and email_verified to true
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        email_confirm: true, // This confirms the email
      }
    );

    if (error) {
      console.error('Error confirming email in Supabase:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to confirm email' },
        { status: 500 }
      );
    }

    console.log('Email confirmed successfully in Supabase for:', email);
    return NextResponse.json({ 
      success: true,
      message: 'Email confirmed in Supabase',
      user: data.user
    });

  } catch (error: any) {
    console.error('Error in confirm-email route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm email' },
      { status: 500 }
    );
  }
}




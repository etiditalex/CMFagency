import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    // NOTE: Resend requires domain verification to send to any email
    // Using onboarding@resend.dev only sends to your verified email
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'CMF Agency <onboarding@resend.dev>';
    
    const testEmail = request.nextUrl.searchParams.get('email') || 'test@example.com';
    
    console.log('Testing email configuration:', {
      hasApiKey: !!resendApiKey,
      apiKeyPrefix: resendApiKey ? resendApiKey.substring(0, 10) + '...' : 'none',
      fromEmail: resendFromEmail,
      testEmail: testEmail,
    });
    
    if (!resendApiKey) {
      return NextResponse.json({ 
        success: false,
        error: 'RESEND_API_KEY not configured',
        envCheck: {
          hasResendKey: !!process.env.RESEND_API_KEY,
          hasFromEmail: !!process.env.RESEND_FROM_EMAIL,
          nodeEnv: process.env.NODE_ENV,
        }
      }, { status: 400 });
    }
    
    // Test Resend API connection
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: testEmail,
          subject: 'Test Email - CMF Agency',
          html: '<h1>Test Email</h1><p>This is a test email from CMF Agency.</p>',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json({ 
          success: false,
          error: data.message || data.error?.message || `Failed: ${response.status}`,
          details: data,
          status: response.status
        }, { status: response.status });
      }

      return NextResponse.json({ 
        success: true,
        message: 'Test email sent successfully',
        emailId: data.id,
        to: testEmail
      });
    } catch (error: any) {
      return NextResponse.json({ 
        success: false,
        error: error.message || 'Failed to send test email',
        stack: error.stack
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Test failed' },
      { status: 500 }
    );
  }
}


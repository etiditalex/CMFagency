/**
 * Email utility for sending verification codes
 * 
 * For production, you can integrate with:
 * - Supabase Edge Functions
 * - Resend (https://resend.com)
 * - SendGrid
 * - AWS SES
 * - Or any other email service
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send verification code via email
 * 
 * This is a placeholder function. In production, you should:
 * 1. Set up Supabase Edge Functions to send emails
 * 2. Or integrate with an email service like Resend, SendGrid, etc.
 * 3. Or use Supabase's email templates with custom variables
 */
export async function sendVerificationCodeEmail(
  email: string,
  code: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Implement actual email sending
    // For now, this is a placeholder
    
    // Option 1: Use Supabase Edge Function
    // const { data, error } = await supabase.functions.invoke('send-verification-email', {
    //   body: { email, code, name }
    // });
    
    // Option 2: Use external email service (e.g., Resend)
    // const response = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'noreply@cmfagency.com',
    //     to: email,
    //     subject: 'Verify Your Email - CMF Agency',
    //     html: generateEmailTemplate(code, name),
    //   }),
    // });
    
    // For development/testing, we'll just log it
    console.log('Verification code email (not sent in development):', {
      to: email,
      code,
      name,
    });
    
    // In production, return the actual result
    return { success: true };
  } catch (error: any) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate HTML email template for verification code
 */
function generateEmailTemplate(code: string, name: string): string {
  return `
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
}





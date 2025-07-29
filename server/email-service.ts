import sgMail from '@sendgrid/mail';
import { User } from '@shared/schema';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid API key is configured');
} else {
  console.warn('SendGrid API key is not configured. Email functionality will be limited.');
}

// Use verified sender email from SendGrid dashboard
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'support@datazag.com';

// Log sender configuration on startup
if (process.env.SENDGRID_API_KEY) {
  console.log(`SendGrid configured with sender email: ${SENDER_EMAIL}`);
  console.log('Using verified sender identity');
}
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

/**
 * Send an email change verification link
 */
export async function sendEmailChangeVerification(user: User, newEmail: string, verificationToken: string): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('Cannot send email change verification: SendGrid API key is not configured');
    return false;
  }

  const verificationUrl = `${BASE_URL}/verify-email-change?token=${verificationToken}&email=${encodeURIComponent(newEmail)}`;
  
  const userName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.email.split('@')[0];

  const msg = {
    to: newEmail,
    from: SENDER_EMAIL,
    subject: 'Verify Your New Email Address - Datazag',
    text: `Hello ${userName},\n\nYou requested to change your email address. Please verify your new email address by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not request this change, please contact support immediately.\n\nThank you,\nThe Datazag Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #131326; padding: 20px; text-align: center;">
          <h1 style="color: #37DEF5; margin: 0;">Datazag</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #eee; background-color: #fff;">
          <h2 style="color: #333;">Verify Your New Email Address</h2>
          <p>Hello ${userName},</p>
          <p>You requested to change your email address from <strong>${user.email}</strong> to <strong>${newEmail}</strong>.</p>
          <p>Please verify your new email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #56A8F5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Verify New Email</a>
          </div>
          <p>Alternatively, you can copy and paste the following link into your browser:</p>
          <p style="background: #f5f5f5; padding: 12px; border-radius: 4px; word-break: break-all;">
            ${verificationUrl}
          </p>
          <p>This link will expire in 24 hours.</p>
          <p><strong>Important:</strong> If you did not request this email change, please contact our support team immediately.</p>
          <p>Thank you,<br>The Datazag Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Datazag. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email change verification sent to: ${newEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send email change verification:', error);
    return false;
  }
}

/**
 * Send an email verification link to a user
 */
export async function sendEmailVerification(user: User, verificationToken: string): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('Cannot send email verification: SendGrid API key is not configured');
    return false;
  }

  const verificationUrl = `${BASE_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
  
  const userName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.email.split('@')[0];

  const msg = {
    to: user.email,
    from: SENDER_EMAIL,
    subject: 'Verify Your Email for Datazag Customer Portal',
    text: `Hello ${userName},\n\nPlease verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nThank you,\nThe Datazag Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #131326; padding: 20px; text-align: center;">
          <h1 style="color: #37DEF5; margin: 0;">Datazag</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #eee; background-color: #fff;">
          <h2 style="color: #333;">Verify Your Email</h2>
          <p>Hello ${userName},</p>
          <p>Thank you for registering with Datazag. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #56A8F5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Verify Email Address</a>
          </div>
          <p>Alternatively, you can copy and paste the following link into your browser:</p>
          <p style="background: #f5f5f5; padding: 12px; border-radius: 4px; word-break: break-all;">
            ${verificationUrl}
          </p>
          <p>This link will expire in 24 hours.</p>
          <p>If you did not create an account with us, please ignore this email.</p>
          <p>Thank you,<br>The Datazag Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Datazag. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`Verification email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}

/**
 * Send a password reset link to a user
 */
export async function sendPasswordResetEmail(user: User, resetToken: string): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('Cannot send password reset email: SendGrid API key is not configured');
    return false;
  }

  const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
  
  const msg = {
    to: user.email,
    from: SENDER_EMAIL,
    subject: 'Reset Your Password for Datazag Customer Portal',
    text: `Hello ${user.username},\n\nYou requested to reset your password. Please click the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request a password reset, please ignore this email.\n\nThank you,\nThe Datazag Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #131326; padding: 20px; text-align: center;">
          <h1 style="color: #37DEF5; margin: 0;">Datazag</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #eee; background-color: #fff;">
          <h2 style="color: #333;">Reset Your Password</h2>
          <p>Hello ${user.username},</p>
          <p>You requested to reset your password. Please click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #56A8F5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Reset Password</a>
          </div>
          <p>Alternatively, you can copy and paste the following link into your browser:</p>
          <p style="background: #f5f5f5; padding: 12px; border-radius: 4px; word-break: break-all;">
            ${resetUrl}
          </p>
          <p>This link will expire in 1 hour.</p>
          <p><strong>Note:</strong> This email may appear in your spam/junk folder. Please check there if you don't see it in your inbox.</p>
          <p>If you did not request a password reset, please ignore this email, and your account will remain secure.</p>
          <p>Thank you,<br>The Datazag Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Datazag. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`Password reset email sent successfully to ${user.email}`);
    return true;
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    if (error.response) {
      console.error('SendGrid response body:', error.response.body);
      
      // Check if it's a sender verification issue
      const errorBody = error.response.body;
      if (errorBody && errorBody.errors) {
        const senderError = errorBody.errors.find((err: any) => 
          err.message && err.message.includes('verified Sender Identity')
        );
        if (senderError) {
          console.log('\n⚠️  SENDGRID SENDER VERIFICATION REQUIRED');
          console.log('Please verify support@datazag.com in your SendGrid dashboard:');
          console.log('1. Go to https://app.sendgrid.com/settings/sender_auth');
          console.log('2. Click "Create New Sender" under Single Sender Verification');
          console.log('3. Use support@datazag.com as the sender email');
          console.log('4. Complete verification by clicking the email link\n');
        }
      }
    }
    return false;
  }
}

/**
 * Send a notification email to a user
 */
export async function sendNotificationEmail(
  user: User,
  subject: string,
  message: string,
  actionLink?: { text: string; url: string }
): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('Cannot send notification email: SendGrid API key is not configured');
    return false;
  }

  const actionButton = actionLink
    ? `<div style="text-align: center; margin: 30px 0;">
         <a href="${actionLink.url}" style="background-color: #56A8F5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">${actionLink.text}</a>
       </div>`
    : '';

  const msg = {
    to: user.email,
    from: SENDER_EMAIL,
    subject,
    text: `Hello ${user.username},\n\n${message}\n\n${actionLink ? `${actionLink.text}: ${actionLink.url}` : ''}\n\nThank you,\nThe Datazag Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #131326; padding: 20px; text-align: center;">
          <h1 style="color: #37DEF5; margin: 0;">Datazag</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #eee; background-color: #fff;">
          <h2 style="color: #333;">${subject}</h2>
          <p>Hello ${user.username},</p>
          <p>${message}</p>
          ${actionButton}
          <p>Thank you,<br>The Datazag Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Datazag. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`Notification email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Error sending notification email:', error);
    return false;
  }
}
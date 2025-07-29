# SendGrid Email Setup Guide

## Current Issue
Password reset emails are failing because SendGrid requires sender identity verification. The error message indicates: "The from address does not match a verified Sender Identity."

## Solution: Verify Your Sender Identity

### Option 1: Single Sender Verification (Recommended for Testing)

1. **Log into SendGrid Dashboard**
   - Go to https://sendgrid.com/
   - Sign in to your account

2. **Navigate to Sender Authentication**
   - Go to Settings > Sender Authentication
   - Click "Get Started" under Single Sender Verification

3. **Create a Verified Sender**
   - Click "Create New Sender"
   - Fill out the form with your details:
     - From Name: "Datazag Support" (or your preferred name)
     - From Email: Use an email you own (e.g., noreply@yourdomain.com)
     - Reply To: Same as From Email or your support email
     - Company Address: Your business address

4. **Verify Your Email**
   - SendGrid will send a verification email to the address you specified
   - Click the verification link in that email

5. **Update Your Application**
   - Once verified, update the `SENDER_EMAIL` in your environment variables:
   ```bash
   SENDER_EMAIL=noreply@yourdomain.com
   ```

### Option 2: Domain Authentication (Recommended for Production)

1. **Navigate to Domain Authentication**
   - Go to Settings > Sender Authentication
   - Click "Get Started" under Domain Authentication

2. **Add Your Domain**
   - Enter your domain (e.g., yourdomain.com)
   - Choose your DNS host
   - Follow the instructions to add DNS records

3. **Verify Domain**
   - Add the required CNAME records to your DNS
   - Click "Verify" in SendGrid dashboard

## Testing Email Delivery

Once you've completed sender verification:

1. **Test with curl:**
```bash
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "your-verified-email@domain.com"},
    "subject": "Test Email",
    "content": [{"type": "text/plain", "value": "Test message"}]
  }'
```

2. **Test password reset in your app:**
   - Go to the login page
   - Click "Forgot password?"
   - Enter your email address
   - Check your inbox for the reset email

## Alternative: Use SendGrid's Sandbox Mode

For development only, you can use SendGrid's sandbox mode:

1. Add this to your email service:
```javascript
const msg = {
  // ... other properties
  mail_settings: {
    sandbox_mode: {
      enable: true
    }
  }
};
```

This will simulate sending emails without actually delivering them.

## Current Application Setup

Your app is configured to use:
- API Key: `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`
- From Email: `no-reply@sandbox-mail.sendgrid.net` (needs to be changed to your verified email)

## Next Steps

1. Complete sender verification in SendGrid dashboard
2. Update `SENDER_EMAIL` environment variable with your verified email
3. Test password reset functionality
4. For production: Set up domain authentication for better deliverability
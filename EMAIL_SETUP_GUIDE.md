# Email Service Setup Guide for Render Deployment

## Problem
The email OTP service is failing with a 500 error when trying to send verification emails during user registration.

## Root Cause
Gmail SMTP might be blocking connections from Render's servers due to:
1. Security restrictions
2. Missing or expired App Password
3. Environment variables not properly configured on Render

## Solutions

### Solution 1: Verify and Update Gmail App Password (Recommended First Step)

1. **Generate a New Gmail App Password:**
   - Go to your Google Account: https://myaccount.google.com/
   - Navigate to Security → 2-Step Verification (must be enabled)
   - Scroll down to "App passwords"
   - Generate a new app password for "Mail" and "Other (Custom name)"
   - Copy the 16-character password (format: xxxx xxxx xxxx xxxx)

2. **Update Render Environment Variables:**
   - Go to your Render dashboard: https://dashboard.render.com/
   - Select your backend service
   - Go to "Environment" tab
   - Add/Update these variables:
     ```
     EMAIL_USER=ayannakiyannanotify@gmail.com
     EMAIL_PASS=your-new-app-password-here (remove spaces)
     ```
   - Click "Save Changes"
   - Render will automatically redeploy your service

### Solution 2: Use SendGrid (More Reliable for Production)

SendGrid is more reliable for production deployments and has a free tier (100 emails/day).

1. **Sign up for SendGrid:**
   - Go to: https://signup.sendgrid.com/
   - Create a free account

2. **Get API Key:**
   - Go to Settings → API Keys
   - Create a new API Key with "Full Access"
   - Copy the API key (you'll only see it once!)

3. **Update Backend Code:**
   
   Install SendGrid package (if not already installed):
   ```bash
   npm install @sendgrid/mail
   ```

4. **Update Render Environment Variables:**
   ```
   SENDGRID_API_KEY=your-sendgrid-api-key
   EMAIL_USER=ayannakiyannanotify@gmail.com
   USE_SENDGRID=true
   ```

### Solution 3: Alternative SMTP Services

If Gmail continues to have issues, consider these alternatives:

1. **Mailgun** (Free tier: 5,000 emails/month)
   - https://www.mailgun.com/

2. **AWS SES** (Very cheap, $0.10 per 1,000 emails)
   - https://aws.amazon.com/ses/

3. **Brevo (formerly Sendinblue)** (Free tier: 300 emails/day)
   - https://www.brevo.com/

## Testing the Fix

After updating environment variables on Render:

1. Wait for the service to redeploy (usually 2-3 minutes)
2. Check the Render logs for:
   ```
   ✅ Email service is ready and connected
   ```
3. Try registering a new user
4. Check Render logs for:
   ```
   📧 Attempting to send OTP email to: user@example.com
   ✅ OTP email sent successfully: <message-id>
   ```

## Debugging

If still having issues, check Render logs for detailed error messages:

1. Go to Render dashboard → Your service → Logs
2. Look for lines starting with:
   - `❌ Email service error:`
   - `❌ Failed to send OTP email:`
3. The error details will show the specific issue

Common errors:
- `Invalid login` → App password is wrong
- `Connection timeout` → Network/firewall issue
- `Authentication failed` → 2-Step verification not enabled or app password expired

## Current Configuration

The backend is now configured with:
- Better error logging
- TLS support for Gmail SMTP
- Detailed error messages in console
- Fallback to config file if environment variables not set

## Quick Fix Checklist

- [ ] Enable 2-Step Verification on Gmail account
- [ ] Generate new Gmail App Password
- [ ] Add EMAIL_USER to Render environment variables
- [ ] Add EMAIL_PASS to Render environment variables (no spaces)
- [ ] Save and wait for redeploy
- [ ] Check Render logs for "Email service is ready"
- [ ] Test user registration
- [ ] Verify email is received

## Contact

If you continue to have issues, the error logs in Render will now show detailed information about what's failing.


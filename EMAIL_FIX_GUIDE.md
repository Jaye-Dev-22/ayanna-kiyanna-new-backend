# 🔧 Email Connection Timeout Fix Guide

## ❌ Problem
You're getting this error when trying to send verification emails:
```
Failed to send verification email
Email service error: Connection timeout
Error code: ETIMEDOUT
```

## 🎯 Root Cause
Gmail SMTP is **blocking connections from Render's servers**. This is a common issue because:
1. Gmail has strict security policies for cloud servers
2. Render's IP addresses might be flagged or rate-limited by Gmail
3. Gmail SMTP is not designed for production transactional emails

## ✅ Solutions (In Order of Recommendation)

---

### **Solution 1: Fix Gmail SMTP Configuration (QUICK FIX - Try This First)**

I've already updated your code with better timeout handling and retry logic. Now you need to:

#### Step 1: Verify Your Gmail App Password

1. **Check if 2-Step Verification is enabled:**
   - Go to: https://myaccount.google.com/security
   - Ensure "2-Step Verification" is **ON**

2. **Generate a NEW App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)" → Name it "Render Backend"
   - Click "Generate"
   - Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)
   - **Remove all spaces** → Final format: `xxxxxxxxxxxxxxxx`

#### Step 2: Update Render Environment Variables

1. Go to your Render Dashboard: https://dashboard.render.com/
2. Select your backend service (ayanna-kiyanna-backend or similar)
3. Click on **"Environment"** tab in the left sidebar
4. Add or update these variables:

```
EMAIL_USER=ayannakiyannanotify@gmail.com
EMAIL_PASS=your-new-app-password-here-no-spaces
```

5. Click **"Save Changes"**
6. Render will automatically redeploy (wait 2-3 minutes)

#### Step 3: Verify the Fix

1. Check Render logs for:
   ```
   ✅ Email service is ready and connected
   📧 Using email: ayannakiyannanotify@gmail.com
   ```

2. Try registering a new user

3. Check logs for:
   ```
   📧 Attempting to send OTP email to: user@example.com
   📤 Sending email (attempt 1/3)...
   ✅ OTP email sent successfully: <message-id>
   ```

---

### **Solution 2: Switch to SendGrid (RECOMMENDED FOR PRODUCTION)**

SendGrid is **FREE** (100 emails/day) and **much more reliable** than Gmail for production.

#### Step 1: Create SendGrid Account

1. Sign up: https://signup.sendgrid.com/
2. Verify your email
3. Complete the setup wizard

#### Step 2: Get API Key

1. Go to: https://app.sendgrid.com/settings/api_keys
2. Click "Create API Key"
3. Name: "Ayanna Kiyanna Backend"
4. Permissions: "Full Access"
5. Click "Create & View"
6. **Copy the API key** (you'll only see it once!)

#### Step 3: Verify Sender Email

1. Go to: https://app.sendgrid.com/settings/sender_auth/senders
2. Click "Create New Sender"
3. Fill in:
   - From Name: `Ayanna Kiyanna Sinhala Institute`
   - From Email: `ayannakiyannanotify@gmail.com`
   - Reply To: Same as above
   - Company Address: Your institute address
4. Click "Save"
5. **Check your email** and click the verification link

#### Step 4: Install SendGrid Package

On your local machine, in the backend directory:
```bash
npm install @sendgrid/mail
```

Then commit and push the changes.

#### Step 5: Update Render Environment Variables

Add these to Render:
```
USE_SENDGRID=true
SENDGRID_API_KEY=your-sendgrid-api-key-here
SENDGRID_FROM_EMAIL=ayannakiyannanotify@gmail.com
SENDGRID_FROM_NAME=Ayanna Kiyanna Sinhala Institute
```

#### Step 6: Update Email Service Code

I'll provide the updated code in the next step if you choose this option.

---

### **Solution 3: Use Alternative SMTP (If Gmail Keeps Failing)**

If Gmail continues to fail, try these alternatives:

#### Option A: Brevo (formerly Sendinblue)
- **Free tier:** 300 emails/day
- **Setup:** https://www.brevo.com/
- **SMTP Settings:**
  ```
  Host: smtp-relay.brevo.com
  Port: 587
  ```

#### Option B: Mailgun
- **Free tier:** 5,000 emails/month (first 3 months)
- **Setup:** https://www.mailgun.com/
- **Good for:** High volume

#### Option C: AWS SES
- **Cost:** $0.10 per 1,000 emails
- **Setup:** https://aws.amazon.com/ses/
- **Good for:** Very high volume, already using AWS

---

## 🔍 Debugging Steps

If still having issues after trying Solution 1:

### Check Render Logs

1. Go to Render Dashboard → Your Service → **Logs**
2. Look for these error patterns:

**Error: Invalid login**
- ❌ App password is incorrect
- ✅ Generate a new app password and update Render

**Error: Connection timeout (ETIMEDOUT)**
- ❌ Gmail is blocking Render's IP
- ✅ Switch to SendGrid (Solution 2)

**Error: Authentication failed**
- ❌ 2-Step Verification not enabled
- ✅ Enable 2-Step Verification on Gmail

**Error: Too many login attempts**
- ❌ Gmail rate limiting
- ✅ Wait 1 hour or switch to SendGrid

### Test Email Configuration Locally

On your local machine:
```bash
cd ayanna-kiyanna-new-backend
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: 'ayannakiyannanotify@gmail.com',
    pass: 'your-app-password-here'
  }
});
transporter.verify((err, success) => {
  if (err) console.error('Error:', err);
  else console.log('Success! Email is configured correctly');
});
"
```

---

## 📋 Quick Checklist

**For Gmail Fix (Solution 1):**
- [ ] 2-Step Verification enabled on Gmail
- [ ] New App Password generated
- [ ] App password has NO SPACES
- [ ] EMAIL_USER added to Render environment variables
- [ ] EMAIL_PASS added to Render environment variables
- [ ] Saved changes and waited for redeploy
- [ ] Checked Render logs for "Email service is ready"
- [ ] Tested user registration
- [ ] Checked email inbox for OTP

**For SendGrid (Solution 2):**
- [ ] SendGrid account created
- [ ] API key generated and saved
- [ ] Sender email verified
- [ ] @sendgrid/mail package installed
- [ ] Environment variables added to Render
- [ ] Code updated to use SendGrid
- [ ] Tested user registration

---

## 🆘 Still Not Working?

If you've tried Solution 1 and it's still failing:

1. **Check the exact error** in Render logs
2. **Try Solution 2 (SendGrid)** - It's free and much more reliable
3. **Contact me** with the full error message from Render logs

---

## 📊 What I've Already Fixed

✅ Added connection timeout handling (10 seconds)
✅ Added socket timeout (30 seconds)
✅ Enabled connection pooling
✅ Added retry logic (3 attempts with exponential backoff)
✅ Added detailed error logging
✅ Added TLS configuration
✅ Added debug mode for better troubleshooting

---

## 🎯 My Recommendation

**For immediate fix:** Try Solution 1 (Gmail with new app password)
**For long-term:** Switch to Solution 2 (SendGrid) - It's free, reliable, and designed for this purpose

SendGrid is what most production applications use for transactional emails. Gmail SMTP is really meant for personal use, not for sending automated emails from servers.


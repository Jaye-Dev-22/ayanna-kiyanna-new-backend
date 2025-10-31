// SendGrid Email Service Implementation
// Use this if Gmail SMTP continues to have connection issues
// To use this file:
// 1. Install SendGrid: npm install @sendgrid/mail
// 2. Rename this file to emailService.js (backup the old one first)
// 3. Set environment variables on Render:
//    - SENDGRID_API_KEY=your-api-key
//    - SENDGRID_FROM_EMAIL=ayannakiyannanotify@gmail.com
//    - SENDGRID_FROM_NAME=Ayanna Kiyanna Sinhala Institute

const sgMail = require('@sendgrid/mail');
const config = require('config');

class EmailService {
  constructor() {
    this.initializeSendGrid();
  }

  initializeSendGrid() {
    try {
      const apiKey = process.env.SENDGRID_API_KEY;
      
      if (!apiKey) {
        console.error('❌ SENDGRID_API_KEY environment variable is not set');
        console.log('Please set SENDGRID_API_KEY in your Render environment variables');
        return;
      }

      sgMail.setApiKey(apiKey);
      console.log('✅ SendGrid email service initialized');
      console.log('📧 Using email:', process.env.SENDGRID_FROM_EMAIL || 'ayannakiyannanotify@gmail.com');
    } catch (error) {
      console.error('❌ Failed to initialize SendGrid:', error);
    }
  }

  async sendOTPEmail(email, otp, fullName = '', retries = 3) {
    console.log(`📧 Attempting to send OTP email to: ${email}`);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const msg = {
          to: email,
          from: {
            email: process.env.SENDGRID_FROM_EMAIL || 'ayannakiyannanotify@gmail.com',
            name: process.env.SENDGRID_FROM_NAME || 'Ayanna Kiyanna Sinhala Institute'
          },
          subject: 'Email Verification - Ayanna Kiyanna Sinhala Institute',
          html: this.getOTPEmailTemplate(otp, fullName)
        };

        console.log(`📤 Sending email via SendGrid (attempt ${attempt}/${retries})...`);
        const result = await sgMail.send(msg);
        console.log('✅ OTP email sent successfully via SendGrid');
        console.log('Response status:', result[0].statusCode);
        return { success: true, messageId: result[0].headers['x-message-id'] };
      } catch (error) {
        console.error(`❌ Failed to send OTP email (attempt ${attempt}/${retries}):`, error.message);
        
        if (error.response) {
          console.error('SendGrid error details:', error.response.body);
        }
        
        // If this is the last attempt, return the error
        if (attempt === retries) {
          console.error('❌ All retry attempts exhausted. Email sending failed.');
          return { 
            success: false, 
            error: error.message,
            suggestion: 'Please verify your SendGrid API key and sender verification'
          };
        }
        
        // Wait before retrying
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  async sendWelcomeEmail(email, fullName) {
    try {
      const msg = {
        to: email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'ayannakiyannanotify@gmail.com',
          name: process.env.SENDGRID_FROM_NAME || 'Ayanna Kiyanna Sinhala Institute'
        },
        subject: 'Welcome to Ayanna Kiyanna Sinhala Institute! 🌸',
        html: this.getWelcomeEmailTemplate(fullName)
      };

      const result = await sgMail.send(msg);
      console.log('✅ Welcome email sent successfully via SendGrid');
      return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetOTPEmail(email, otp, fullName = '') {
    try {
      const msg = {
        to: email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'ayannakiyannanotify@gmail.com',
          name: process.env.SENDGRID_FROM_NAME || 'Ayanna Kiyanna Sinhala Institute'
        },
        subject: 'Password Reset - Ayanna Kiyanna Sinhala Institute',
        html: this.getPasswordResetEmailTemplate(otp, fullName)
      };

      const result = await sgMail.send(msg);
      console.log('✅ Password reset OTP email sent successfully via SendGrid');
      return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error) {
      console.error('❌ Failed to send password reset OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendUserPasswordResetOTPEmail(email, otp, fullName = '') {
    try {
      const msg = {
        to: email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'ayannakiyannanotify@gmail.com',
          name: process.env.SENDGRID_FROM_NAME || 'Ayanna Kiyanna Sinhala Institute'
        },
        subject: 'Account Password Reset - Ayanna Kiyanna Sinhala Institute',
        html: this.getUserPasswordResetEmailTemplate(otp, fullName)
      };

      const result = await sgMail.send(msg);
      console.log('✅ User password reset OTP email sent successfully via SendGrid');
      return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error) {
      console.error('❌ Failed to send user password reset OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendContactNotificationEmail(adminEmail, contactData) {
    try {
      const msg = {
        to: adminEmail,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'ayannakiyannanotify@gmail.com',
          name: 'Ayanna Kiyanna Sinhala Institute - Contact Form'
        },
        replyTo: contactData.email,
        subject: `New Contact Message from ${contactData.name} - Ayanna Kiyanna`,
        html: this.getContactNotificationEmailTemplate(contactData)
      };

      const result = await sgMail.send(msg);
      console.log('✅ Contact notification email sent successfully via SendGrid');
      return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error) {
      console.error('❌ Failed to send contact notification email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetConfirmationEmail(email, fullName = '') {
    try {
      const msg = {
        to: email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'ayannakiyannanotify@gmail.com',
          name: process.env.SENDGRID_FROM_NAME || 'Ayanna Kiyanna Sinhala Institute'
        },
        subject: 'Password Reset Successful - Ayanna Kiyanna Sinhala Institute',
        html: this.getPasswordResetConfirmationTemplate(fullName)
      };

      const result = await sgMail.send(msg);
      console.log('✅ Password reset confirmation email sent successfully via SendGrid');
      return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error) {
      console.error('❌ Failed to send password reset confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendUserPasswordResetConfirmationEmail(email, fullName = '') {
    try {
      const msg = {
        to: email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'ayannakiyannanotify@gmail.com',
          name: process.env.SENDGRID_FROM_NAME || 'Ayanna Kiyanna Sinhala Institute'
        },
        subject: 'Account Password Reset Successful - Ayanna Kiyanna Sinhala Institute',
        html: this.getUserPasswordResetConfirmationTemplate(fullName)
      };

      const result = await sgMail.send(msg);
      console.log('✅ User password reset confirmation email sent successfully via SendGrid');
      return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error) {
      console.error('❌ Failed to send user password reset confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  // All the email template methods remain the same as in the original emailService.js
  // Copy them from the original file: getOTPEmailTemplate, getWelcomeEmailTemplate, etc.
  
  getOTPEmailTemplate(otp, fullName) {
    // Copy from original emailService.js
    return `[Same HTML template as original - see emailService.js line 57-161]`;
  }

  getWelcomeEmailTemplate(fullName) {
    // Copy from original emailService.js
    return `[Same HTML template as original - see emailService.js]`;
  }

  getPasswordResetEmailTemplate(otp, fullName) {
    // Copy from original emailService.js
    return `[Same HTML template as original - see emailService.js]`;
  }

  getUserPasswordResetEmailTemplate(otp, fullName) {
    // Copy from original emailService.js
    return `[Same HTML template as original - see emailService.js]`;
  }

  getContactNotificationEmailTemplate(contactData) {
    // Copy from original emailService.js
    return `[Same HTML template as original - see emailService.js]`;
  }

  getPasswordResetConfirmationTemplate(fullName) {
    // Copy from original emailService.js
    return `[Same HTML template as original - see emailService.js]`;
  }

  getUserPasswordResetConfirmationTemplate(fullName) {
    // Copy from original emailService.js
    return `[Same HTML template as original - see emailService.js]`;
  }
}

module.exports = new EmailService();


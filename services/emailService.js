const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const config = require('config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.useSendGrid = false;
    this.fromEmail = '';
    this.fromName = '';
    this.initializeEmailService();
  }

  initializeEmailService() {
    // Check if SendGrid should be used (preferred for production)
    const sendGridApiKey = process.env.SENDGRID_API_KEY;

    if (sendGridApiKey) {
      this.initializeSendGrid(sendGridApiKey);
    } else {
      console.log('⚠️ SENDGRID_API_KEY not found, falling back to Gmail SMTP');
      console.log('For better reliability, consider using SendGrid in production');
      this.initializeGmailSMTP();
    }
  }

  initializeSendGrid(apiKey) {
    try {
      sgMail.setApiKey(apiKey);
      this.useSendGrid = true;
      this.fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER || config.get('email.user');
      this.fromName = process.env.SENDGRID_FROM_NAME || 'Ayanna Kiyanna Sinhala Institute';

      console.log('✅ SendGrid email service initialized');
      console.log('📧 Using SendGrid with email:', this.fromEmail);
      console.log('📤 From name:', this.fromName);
      console.log('🎯 Email provider: SendGrid (Production-ready)');
    } catch (error) {
      console.error('❌ Failed to initialize SendGrid:', error);
      console.log('Falling back to Gmail SMTP...');
      this.initializeGmailSMTP();
    }
  }

  initializeGmailSMTP() {
    try {
      this.useSendGrid = false;
      this.fromEmail = process.env.EMAIL_USER || config.get('email.user');
      this.fromName = 'Ayanna Kiyanna Sinhala Institute';

      // Enhanced Gmail SMTP configuration with better timeout and TLS settings
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // Use STARTTLS
        auth: {
          user: this.fromEmail,
          pass: process.env.EMAIL_PASS || config.get('email.pass')
        },
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false
        },
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
        socketTimeout: 30000, // 30 seconds
        pool: true, // Use connection pooling
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
        debug: true, // Enable debug logs
        logger: true // Enable logger
      });

      console.log('🎯 Email provider: Gmail SMTP (Development)');
      console.log('📧 Using email:', this.fromEmail);

      // Verify connection with timeout
      const verifyTimeout = setTimeout(() => {
        console.log('⚠️ Email service verification is taking longer than expected...');
        console.log('This might indicate network issues or Gmail blocking the connection.');
        console.log('💡 Recommendation: Use SendGrid for production (set SENDGRID_API_KEY)');
      }, 5000);

      this.transporter.verify((error, success) => {
        clearTimeout(verifyTimeout);
        if (error) {
          console.log('❌ Gmail SMTP connection error:', error.message);
          console.log('Error code:', error.code);
          console.log('');
          console.log('Troubleshooting steps:');
          console.log('1. Verify EMAIL_USER and EMAIL_PASS environment variables are set');
          console.log('2. Ensure you are using a Gmail App Password (not your regular password)');
          console.log('3. Check if 2-Step Verification is enabled on your Gmail account');
          console.log('4. 🌟 RECOMMENDED: Switch to SendGrid for better reliability');
        } else {
          console.log('✅ Gmail SMTP service is ready and connected');
        }
      });
    } catch (error) {
      console.error('❌ Failed to initialize Gmail SMTP service:', error);
    }
  }

  async sendOTPEmail(email, otp, fullName = '', retries = 3) {
    console.log(`📧 Attempting to send OTP email to: ${email}`);
    console.log(`🎯 Using provider: ${this.useSendGrid ? 'SendGrid' : 'Gmail SMTP'}`);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (this.useSendGrid) {
          // SendGrid implementation
          const msg = {
            to: email,
            from: {
              email: this.fromEmail,
              name: this.fromName
            },
            subject: 'Email Verification - Ayanna Kiyanna Sinhala Institute',
            html: this.getOTPEmailTemplate(otp, fullName)
          };

          console.log(`📤 Sending email via SendGrid (attempt ${attempt}/${retries})...`);
          const result = await sgMail.send(msg);
          console.log('✅ OTP email sent successfully via SendGrid');
          console.log('Response status:', result[0].statusCode);
          return {
            success: true,
            messageId: result[0].headers['x-message-id'],
            provider: 'SendGrid'
          };
        } else {
          // Gmail SMTP implementation
          const mailOptions = {
            from: {
              name: this.fromName,
              address: this.fromEmail
            },
            to: email,
            subject: 'Email Verification - Ayanna Kiyanna Sinhala Institute',
            html: this.getOTPEmailTemplate(otp, fullName),
            timeout: 25000 // 25 seconds
          };

          console.log(`📤 Sending email via Gmail SMTP (attempt ${attempt}/${retries})...`);
          const result = await this.transporter.sendMail(mailOptions);
          console.log('✅ OTP email sent successfully via Gmail SMTP');
          console.log('Message ID:', result.messageId);
          return {
            success: true,
            messageId: result.messageId,
            provider: 'Gmail SMTP'
          };
        }
      } catch (error) {
        console.error(`❌ Failed to send OTP email (attempt ${attempt}/${retries}):`, error.message);

        if (error.response) {
          console.error('Error details:', error.response.body || error.code);
        } else if (error.code) {
          console.error('Error code:', error.code);
        }

        // If this is the last attempt, return the error
        if (attempt === retries) {
          console.error('❌ All retry attempts exhausted. Email sending failed.');
          if (!this.useSendGrid) {
            console.error('💡 Suggestion: Switch to SendGrid for better reliability');
          }
          return {
            success: false,
            error: error.message,
            code: error.code || error.response?.body?.errors?.[0]?.message,
            suggestion: this.useSendGrid
              ? 'Please verify your SendGrid API key and sender verification'
              : 'Please verify your email configuration or switch to SendGrid'
          };
        }

        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  getOTPEmailTemplate(otp, fullName) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #e91e63;
                margin-bottom: 10px;
            }
            .otp-box {
                background: linear-gradient(135deg, #e91e63, #ff6b35);
                color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                margin: 20px 0;
            }
            .otp-code {
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 5px;
                margin: 10px 0;
            }
            .warning {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🌸 Ayanna Kiyanna Sinhala Institute</div>
                <h2>Email Verification Required</h2>
            </div>

            <p>Hello ${fullName || 'there'},</p>

            <p>Thank you for registering with Ayanna Kiyanna Sinhala Institute! To complete your registration, please verify your email address using the OTP code below:</p>

            <div class="otp-box">
                <div>Your Verification Code</div>
                <div class="otp-code">${otp}</div>
                <div>Valid for 10 minutes</div>
            </div>

            <p>Please enter this code in the verification form to activate your account.</p>

            <div class="warning">
                <strong>Security Notice:</strong>
                <ul>
                    <li>This code will expire in 10 minutes</li>
                    <li>Do not share this code with anyone</li>
                    <li>If you didn't request this verification, please ignore this email</li>
                </ul>
            </div>

            <p>If you have any questions or need assistance, please contact our support team.</p>

            <div class="footer">
                <p>Best regards,<br>
                <strong>Ayanna Kiyanna Sinhala Institute Team</strong></p>
                <p><small>This is an automated email. Please do not reply to this message.</small></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Helper method to send email using either SendGrid or Gmail SMTP
  async sendEmail(to, subject, html, options = {}) {
    try {
      if (this.useSendGrid) {
        const msg = {
          to,
          from: {
            email: this.fromEmail,
            name: options.fromName || this.fromName
          },
          subject,
          html,
          ...(options.replyTo && { replyTo: options.replyTo })
        };

        const result = await sgMail.send(msg);
        return {
          success: true,
          messageId: result[0].headers['x-message-id'],
          provider: 'SendGrid'
        };
      } else {
        const mailOptions = {
          from: {
            name: options.fromName || this.fromName,
            address: this.fromEmail
          },
          to,
          subject,
          html,
          ...(options.replyTo && { replyTo: options.replyTo })
        };

        const result = await this.transporter.sendMail(mailOptions);
        return {
          success: true,
          messageId: result.messageId,
          provider: 'Gmail SMTP'
        };
      }
    } catch (error) {
      throw error;
    }
  }

  async sendWelcomeEmail(email, fullName) {
    try {
      const result = await this.sendEmail(
        email,
        'Welcome to Ayanna Kiyanna Sinhala Institute! 🌸',
        this.getWelcomeEmailTemplate(fullName)
      );
      console.log(`✅ Welcome email sent successfully via ${result.provider}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetOTPEmail(email, otp, fullName = '') {
    try {
      const result = await this.sendEmail(
        email,
        'Password Reset - Ayanna Kiyanna Sinhala Institute',
        this.getPasswordResetEmailTemplate(otp, fullName)
      );
      console.log(`✅ Password reset OTP email sent successfully via ${result.provider}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to send password reset OTP email:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendUserPasswordResetOTPEmail(email, otp, fullName = '') {
    try {
      const result = await this.sendEmail(
        email,
        'Account Password Reset - Ayanna Kiyanna Sinhala Institute',
        this.getUserPasswordResetEmailTemplate(otp, fullName)
      );
      console.log(`✅ User password reset OTP email sent successfully via ${result.provider}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to send user password reset OTP email:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendContactNotificationEmail(adminEmail, contactData) {
    try {
      const result = await this.sendEmail(
        adminEmail,
        `New Contact Message from ${contactData.name} - Ayanna Kiyanna`,
        this.getContactNotificationEmailTemplate(contactData),
        {
          fromName: 'Ayanna Kiyanna Sinhala Institute - Contact Form',
          replyTo: contactData.email
        }
      );
      console.log(`✅ Contact notification email sent successfully via ${result.provider}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to send contact notification email:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetConfirmationEmail(email, fullName = '') {
    try {
      const result = await this.sendEmail(
        email,
        'Password Reset Successful - Ayanna Kiyanna Sinhala Institute',
        this.getPasswordResetConfirmationTemplate(fullName)
      );
      console.log(`✅ Password reset confirmation email sent successfully via ${result.provider}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to send password reset confirmation email:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendUserPasswordResetConfirmationEmail(email, fullName = '') {
    try {
      const result = await this.sendEmail(
        email,
        'Account Password Reset Successful - Ayanna Kiyanna Sinhala Institute',
        this.getUserPasswordResetConfirmationTemplate(fullName)
      );
      console.log(`✅ User password reset confirmation email sent successfully via ${result.provider}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to send user password reset confirmation email:', error.message);
      return { success: false, error: error.message };
    }
  }

  getPasswordResetEmailTemplate(otp, fullName) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Ayanna Kiyanna</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #e91e63;
                margin-bottom: 10px;
            }
            .otp-box {
                background: linear-gradient(135deg, #ff6b35, #e91e63);
                color: white;
                padding: 25px;
                border-radius: 8px;
                text-align: center;
                margin: 20px 0;
            }
            .otp-code {
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                margin: 15px 0;
                padding: 15px;
                background: rgba(255,255,255,0.2);
                border-radius: 8px;
                border: 2px dashed rgba(255,255,255,0.5);
            }
            .warning {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🌸 Ayanna Kiyanna Sinhala Institute</div>
            </div>

            <h2>🔐 Student Password Reset Request</h2>

            <p>Hello ${fullName || 'there'},</p>

            <p>We received a request to reset your student dashboard password. To proceed with the password reset, please use the verification code below:</p>

            <div class="otp-box">
                <div>Your Password Reset Code</div>
                <div class="otp-code">${otp}</div>
                <div>Valid for 10 minutes</div>
            </div>

            <p>Please enter this code in the password reset form to continue.</p>

            <div class="warning">
                <strong>Security Notice:</strong>
                <ul>
                    <li>This code will expire in 10 minutes</li>
                    <li>Do not share this code with anyone</li>
                    <li>If you didn't request this password reset, please ignore this email</li>
                    <li>Your account remains secure until you complete the reset process</li>
                </ul>
            </div>

            <p>If you continue to have trouble accessing your account, please contact our support team.</p>

            <div class="footer">
                <p>Best regards,<br>
                <strong>Ayanna Kiyanna Sinhala Institute Team</strong></p>
                <p><small>This is an automated message. Please do not reply to this email.</small></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getPasswordResetConfirmationTemplate(fullName) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Successful - Ayanna Kiyanna</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #e91e63;
                margin-bottom: 10px;
            }
            .success-box {
                background: linear-gradient(135deg, #4caf50, #45a049);
                color: white;
                padding: 25px;
                border-radius: 8px;
                text-align: center;
                margin: 20px 0;
            }
            .info {
                background: #e3f2fd;
                border: 1px solid #bbdefb;
                color: #1565c0;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🌸 Ayanna Kiyanna Sinhala Institute</div>
            </div>

            <div class="success-box">
                <h2>✅ Password Reset Successful!</h2>
                <p>Your student dashboard password has been updated</p>
            </div>

            <p>Hello ${fullName || 'there'},</p>

            <p>This email confirms that your student dashboard password has been successfully reset. You can now log in to your student dashboard using your new password.</p>

            <div class="info">
                <strong>What's Next?</strong>
                <ul>
                    <li>🔐 Log in to your student dashboard with your new password</li>
                    <li>📚 Continue your learning journey</li>
                    <li>🎯 Access your enrolled classes and materials</li>
                </ul>
            </div>

            <p>If you did not request this password reset, please contact our support team immediately.</p>

            <div class="footer">
                <p>Best regards,<br>
                <strong>Ayanna Kiyanna Sinhala Institute Team</strong></p>
                <p><small>This is an automated message. Please do not reply to this email.</small></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getWelcomeEmailTemplate(fullName) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Ayanna Kiyanna</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #e91e63;
                margin-bottom: 10px;
            }
            .welcome-box {
                background: linear-gradient(135deg, #e91e63, #ff6b35);
                color: white;
                padding: 25px;
                border-radius: 8px;
                text-align: center;
                margin: 20px 0;
            }
            .features {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🌸 Ayanna Kiyanna Sinhala Institute</div>
            </div>

            <div class="welcome-box">
                <h2>Welcome, ${fullName}! 🎉</h2>
                <p>Your email has been successfully verified!</p>
            </div>

            <p>We're thrilled to have you join our community of Sinhala language learners and enthusiasts!</p>

            <div class="features">
                <h3>What's Next?</h3>
                <ul>
                    <li>🎓 Explore our comprehensive Sinhala courses</li>
                    <li>📚 Access learning materials and resources</li>
                    <li>👥 Connect with fellow learners</li>
                    <li>🏆 Track your learning progress</li>
                    <li>💬 Get support from our expert teachers</li>
                </ul>
            </div>

            <p>Start your Sinhala learning journey today and discover the beauty of this ancient language!</p>

            <div class="footer">
                <p>Happy Learning!<br>
                <strong>Ayanna Kiyanna Sinhala Institute Team</strong></p>
                <p><small>If you have any questions, feel free to contact our support team.</small></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getUserPasswordResetEmailTemplate(otp, fullName) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Password Reset - Ayanna Kiyanna</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #e91e63;
                margin-bottom: 10px;
            }
            .otp-box {
                background: linear-gradient(135deg, #9c27b0, #673ab7);
                color: white;
                padding: 25px;
                border-radius: 8px;
                text-align: center;
                margin: 20px 0;
            }
            .otp-code {
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                margin: 15px 0;
                padding: 15px;
                background: rgba(255,255,255,0.2);
                border-radius: 8px;
                border: 2px dashed rgba(255,255,255,0.5);
            }
            .warning {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🌸 Ayanna Kiyanna Sinhala Institute</div>
            </div>

            <h2>🔐 Account Password Reset Request</h2>

            <p>Hello ${fullName || 'there'},</p>

            <p>We received a request to reset your account password. To proceed with the password reset, please use the verification code below:</p>

            <div class="otp-box">
                <div>Your Password Reset Code</div>
                <div class="otp-code">${otp}</div>
                <div>Valid for 10 minutes</div>
            </div>

            <p>Please enter this code in the password reset form to continue.</p>

            <div class="warning">
                <strong>Security Notice:</strong>
                <ul>
                    <li>This code will expire in 10 minutes</li>
                    <li>Do not share this code with anyone</li>
                    <li>If you didn't request this password reset, please ignore this email</li>
                    <li>Your account remains secure until you complete the reset process</li>
                </ul>
            </div>

            <p>If you continue to have trouble accessing your account, please contact our support team.</p>

            <div class="footer">
                <p>Best regards,<br>
                <strong>Ayanna Kiyanna Sinhala Institute Team</strong></p>
                <p><small>This is an automated message. Please do not reply to this email.</small></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getUserPasswordResetConfirmationTemplate(fullName) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Password Reset Successful - Ayanna Kiyanna</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #e91e63;
                margin-bottom: 10px;
            }
            .success-box {
                background: linear-gradient(135deg, #4caf50, #45a049);
                color: white;
                padding: 25px;
                border-radius: 8px;
                text-align: center;
                margin: 20px 0;
            }
            .info {
                background: #e3f2fd;
                border: 1px solid #bbdefb;
                color: #1565c0;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🌸 Ayanna Kiyanna Sinhala Institute</div>
            </div>

            <div class="success-box">
                <h2>✅ Account Password Reset Successful!</h2>
                <p>Your account password has been updated</p>
            </div>

            <p>Hello ${fullName || 'there'},</p>

            <p>This email confirms that your account password has been successfully reset. You can now log in to your account using your new password.</p>

            <div class="info">
                <strong>What's Next?</strong>
                <ul>
                    <li>🔐 Log in to your account with your new password</li>
                    <li>🌟 Continue exploring our platform</li>
                    <li>📚 Access all available features and services</li>
                    <li>🎯 Enjoy a secure and seamless experience</li>
                </ul>
            </div>

            <p>If you did not request this password reset, please contact our support team immediately.</p>

            <div class="footer">
                <p>Best regards,<br>
                <strong>Ayanna Kiyanna Sinhala Institute Team</strong></p>
                <p><small>This is an automated message. Please do not reply to this email.</small></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getContactNotificationEmailTemplate(contactData) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Message - Ayanna Kiyanna</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #e91e63;
                margin-bottom: 10px;
            }
            .contact-box {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                padding: 25px;
                border-radius: 8px;
                text-align: center;
                margin: 20px 0;
            }
            .contact-details {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #e91e63;
            }
            .message-content {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 14px;
            }
            .detail-row {
                margin-bottom: 10px;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }
            .detail-label {
                font-weight: bold;
                color: #e91e63;
                display: inline-block;
                width: 120px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🌸 Ayanna Kiyanna Sinhala Institute</div>
            </div>

            <div class="contact-box">
                <h2>📧 New Contact Message Received!</h2>
                <p>Someone has sent a message through the website contact form</p>
            </div>

            <div class="contact-details">
                <h3>Contact Information:</h3>
                <div class="detail-row">
                    <span class="detail-label">Name:</span>
                    <span>${contactData.name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <span><a href="mailto:${contactData.email}">${contactData.email}</a></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Submitted:</span>
                    <span>${contactData.submittedAt}</span>
                </div>
            </div>

            <div class="message-content">
                <h3>Message:</h3>
                <p style="white-space: pre-wrap; margin: 0;">${contactData.message}</p>
            </div>

            <p><strong>Action Required:</strong> Please respond to this inquiry as soon as possible. You can reply directly to this email to contact the sender.</p>

            <div class="footer">
                <p>Best regards,<br>
                <strong>Ayanna Kiyanna Website System</strong></p>
                <p><small>This is an automated notification from the website contact form.</small></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

module.exports = new EmailService();

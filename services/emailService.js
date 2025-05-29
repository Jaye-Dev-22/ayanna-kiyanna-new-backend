const nodemailer = require('nodemailer');
const config = require('config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // For development, use Gmail SMTP
      // In production, you should use a proper email service like SendGrid, AWS SES, etc.
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || config.get('email.user'),
          pass: process.env.EMAIL_PASS || config.get('email.pass')
        }
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.log('Email service error:', error.message);
          console.log('Please check your email configuration in config/default.json');
        } else {
          console.log('✅ Email service is ready and connected');
        }
      });
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  async sendOTPEmail(email, otp, fullName = '') {
    try {
      const mailOptions = {
        from: {
          name: 'Ayanna Kiyanna Sinhala Institute',
          address: process.env.EMAIL_USER || config.get('email.user')
        },
        to: email,
        subject: 'Email Verification - Ayanna Kiyanna Sinhala Institute',
        html: this.getOTPEmailTemplate(otp, fullName)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('OTP email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      return { success: false, error: error.message };
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

  async sendWelcomeEmail(email, fullName) {
    try {
      const mailOptions = {
        from: {
          name: 'Ayanna Kiyanna Sinhala Institute',
          address: process.env.EMAIL_USER || config.get('email.user')
        },
        to: email,
        subject: 'Welcome to Ayanna Kiyanna Sinhala Institute! 🌸',
        html: this.getWelcomeEmailTemplate(fullName)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetOTPEmail(email, otp, fullName = '') {
    try {
      const mailOptions = {
        from: {
          name: 'Ayanna Kiyanna Sinhala Institute',
          address: process.env.EMAIL_USER || config.get('email.user')
        },
        to: email,
        subject: 'Password Reset - Ayanna Kiyanna Sinhala Institute',
        html: this.getPasswordResetEmailTemplate(otp, fullName)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Password reset OTP email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send password reset OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetConfirmationEmail(email, fullName = '') {
    try {
      const mailOptions = {
        from: {
          name: 'Ayanna Kiyanna Sinhala Institute',
          address: process.env.EMAIL_USER || config.get('email.user')
        },
        to: email,
        subject: 'Password Reset Successful - Ayanna Kiyanna Sinhala Institute',
        html: this.getPasswordResetConfirmationTemplate(fullName)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Password reset confirmation email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send password reset confirmation email:', error);
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
}

module.exports = new EmailService();

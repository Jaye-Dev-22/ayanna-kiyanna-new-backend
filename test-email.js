// Email Configuration Test Script
// Run this locally to test if your email credentials work
// Usage: node test-email.js

const nodemailer = require('nodemailer');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('='.repeat(60));
console.log('📧 Email Configuration Test Tool');
console.log('='.repeat(60));
console.log('');

// Prompt for email and password
rl.question('Enter your Gmail address (e.g., ayannakiyannanotify@gmail.com): ', (email) => {
  rl.question('Enter your Gmail App Password (16 characters, no spaces): ', (password) => {
    rl.question('Enter test recipient email: ', (recipient) => {
      rl.close();
      
      console.log('');
      console.log('Testing email configuration...');
      console.log('From:', email);
      console.log('To:', recipient);
      console.log('');

      // Create transporter with enhanced configuration
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: email,
          pass: password
        },
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 30000,
        debug: true,
        logger: true
      });

      // Test connection
      console.log('Step 1: Testing SMTP connection...');
      transporter.verify((error, success) => {
        if (error) {
          console.log('');
          console.log('❌ Connection Test FAILED');
          console.log('Error:', error.message);
          console.log('Error Code:', error.code);
          console.log('');
          console.log('Common Issues:');
          console.log('- ETIMEDOUT: Gmail is blocking the connection');
          console.log('- Invalid login: Wrong email or app password');
          console.log('- Authentication failed: 2-Step Verification not enabled');
          console.log('');
          console.log('Solutions:');
          console.log('1. Enable 2-Step Verification: https://myaccount.google.com/security');
          console.log('2. Generate App Password: https://myaccount.google.com/apppasswords');
          console.log('3. Use the 16-character app password (no spaces)');
          console.log('4. If still failing, consider using SendGrid instead');
          process.exit(1);
        } else {
          console.log('✅ Connection Test PASSED');
          console.log('');
          console.log('Step 2: Sending test email...');
          
          // Send test email
          const mailOptions = {
            from: {
              name: 'Ayanna Kiyanna Test',
              address: email
            },
            to: recipient,
            subject: 'Test Email - Ayanna Kiyanna Email Service',
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; padding: 20px; }
                  .container { max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 30px; border-radius: 10px; }
                  .success { background: #4caf50; color: white; padding: 20px; border-radius: 5px; text-align: center; }
                  .info { background: white; padding: 20px; margin-top: 20px; border-radius: 5px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="success">
                    <h2>✅ Email Service Test Successful!</h2>
                  </div>
                  <div class="info">
                    <h3>Test Details:</h3>
                    <p><strong>From:</strong> ${email}</p>
                    <p><strong>To:</strong> ${recipient}</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Service:</strong> Gmail SMTP</p>
                    <hr>
                    <p>If you received this email, your email configuration is working correctly!</p>
                    <p>You can now use these credentials in your Render environment variables:</p>
                    <ul>
                      <li>EMAIL_USER=${email}</li>
                      <li>EMAIL_PASS=your-app-password</li>
                    </ul>
                  </div>
                </div>
              </body>
              </html>
            `
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.log('');
              console.log('❌ Email Send FAILED');
              console.log('Error:', error.message);
              console.log('');
              console.log('The connection works, but sending failed.');
              console.log('This might be a temporary Gmail issue.');
              console.log('Try again in a few minutes or use SendGrid.');
              process.exit(1);
            } else {
              console.log('✅ Email Send SUCCESSFUL');
              console.log('Message ID:', info.messageId);
              console.log('');
              console.log('='.repeat(60));
              console.log('🎉 SUCCESS! Your email configuration is working!');
              console.log('='.repeat(60));
              console.log('');
              console.log('Next Steps:');
              console.log('1. Check the recipient inbox for the test email');
              console.log('2. Add these to your Render environment variables:');
              console.log(`   EMAIL_USER=${email}`);
              console.log(`   EMAIL_PASS=your-app-password`);
              console.log('3. Save and redeploy on Render');
              console.log('4. Test user registration on your live site');
              console.log('');
              process.exit(0);
            }
          });
        }
      });
    });
  });
});


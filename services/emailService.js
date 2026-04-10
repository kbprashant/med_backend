const transporter = require('../config/email');

class EmailService {
  async sendEmail({ to, subject, html }) {
    try {
      console.log(`📧 Attempting to send email to: ${to}`);
      console.log(`📧 Subject: ${subject}`);
      
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
      });

      console.log('✅ Email sent successfully!');
      console.log('📧 Message ID:', info.messageId);
      console.log('📧 Recipient:', to);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ EMAIL SENDING FAILED');
      console.error('❌ Error Message:', error.message);
      console.error('❌ Error Code:', error.code);
      console.error('❌ Recipient:', to);
      console.error('❌ Full Error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendOtpEmail(email, otpCode, name) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px; color: #667eea; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 MedTrack</h1>
            <p>Your Healthcare Companion</p>
          </div>
          <div class="content">
            <h2>Hello ${name || 'User'}!</h2>
            <p>Your One-Time Password (OTP) for verification is:</p>
            <div class="otp-box">${otpCode}</div>
            <p><strong>⏰ This OTP will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</strong></p>
            <p>If you didn't request this OTP, please ignore this email.</p>
            <p>For security reasons, never share this OTP with anyone.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} MedTrack. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Your MedTrack Verification Code',
      html,
    });
  }

  async sendRegistrationSuccessEmail(email, name) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-icon { font-size: 64px; text-align: center; margin: 20px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 MedTrack</h1>
          </div>
          <div class="content">
            <div class="success-icon">✅</div>
            <h2>Welcome to MedTrack, ${name}!</h2>
            <p>Your account has been successfully verified and activated.</p>
            <p>You can now:</p>
            <ul>
              <li>📊 Upload and manage your medical reports</li>
              <li>📈 Track your health metrics over time</li>
              <li>🔍 Get AI-powered health insights</li>
              <li>📱 Access your data anytime, anywhere</li>
            </ul>
            <p>Start your health journey with us today!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} MedTrack. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: '🎉 Welcome to MedTrack - Registration Successful!',
      html,
    });
  }

  async sendPasswordChangedEmail(email, name) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 MedTrack</h1>
          </div>
          <div class="content">
            <h2>Password Changed Successfully</h2>
            <p>Hello ${name},</p>
            <p>Your password has been changed successfully at ${new Date().toLocaleString()}.</p>
            <div class="alert-box">
              <strong>⚠️ Security Alert:</strong><br>
              If you did not make this change, please contact our support team immediately and secure your account.
            </div>
            <p>For your security, we recommend:</p>
            <ul>
              <li>Using a strong, unique password</li>
              <li>Not sharing your password with anyone</li>
              <li>Changing your password regularly</li>
            </ul>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} MedTrack. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: '🔒 MedTrack - Password Changed Successfully',
      html,
    });
  }

  async sendHealthNotification(email, name, message) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .notification-box { background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 MedTrack</h1>
            <p>Health Update</p>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <div class="notification-box">
              ${message}
            </div>
            <p>Stay healthy and keep tracking your health metrics!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} MedTrack. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: '🏥 MedTrack Health Notification',
      html,
    });
  }

  async sendDoctorOtpEmail(email, otpCode, name) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px dashed #4facfe; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px; color: #4facfe; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🩺 MedTrack Doctor Portal</h1>
            <p>Healthcare Professional Verification</p>
          </div>
          <div class="content">
            <h2>Hello Dr. ${name || 'Doctor'}!</h2>
            <p>Your One-Time Password (OTP) for verification is:</p>
            <div class="otp-box">${otpCode}</div>
            <p><strong>⏰ This OTP will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</strong></p>
            <p>If you didn't request this OTP, please ignore this email.</p>
            <p>For security reasons, never share this OTP with anyone.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} MedTrack Doctor Portal. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'MedTrack Doctor Verification Code',
      html,
    });
  }

  async sendDoctorRegistrationSuccessEmail(email, name) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-icon { font-size: 64px; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🩺 MedTrack Doctor Portal</h1>
          </div>
          <div class="content">
            <div class="success-icon">✅</div>
            <h2>Welcome to MedTrack, Dr. ${name}!</h2>
            <p>Your doctor account has been successfully verified and activated.</p>
            <p>You can now:</p>
            <ul>
              <li>📅 Manage your appointment schedules</li>
              <li>👥 View and manage patient appointments</li>
              <li>🕐 Set your available time slots</li>
              <li>📱 Access your dashboard anytime, anywhere</li>
            </ul>
            <p>Start managing your practice with us today!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} MedTrack Doctor Portal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: '🎉 Welcome to MedTrack Doctor Portal - Registration Successful!',
      html,
    });
  }
}

module.exports = new EmailService();

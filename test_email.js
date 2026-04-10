require('dotenv').config();
const emailService = require('./services/emailService');
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('🧪 Testing Email Configuration...\n');
  
  console.log('📧 Email Settings:');
  console.log('   SMTP_HOST:', process.env.SMTP_HOST);
  console.log('   SMTP_PORT:', process.env.SMTP_PORT);
  console.log('   SMTP_SECURE:', process.env.SMTP_SECURE);
  console.log('   SMTP_USER:', process.env.SMTP_USER);
  console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'NOT SET');
  console.log('   EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('');

  // Get test email from command line or use default
  const testEmail = process.argv[2] || 'test@example.com';
  
  console.log('🔍 Testing SMTP Connection...\n');
  
  // Test direct connection first
  try {
    const testTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
    });

    console.log('⏳ Verifying connection...');
    await testTransporter.verify();
    console.log('✅ SMTP connection successful!\n');
  } catch (error) {
    console.log('❌ SMTP connection failed!');
    console.log('   Error:', error.message);
    console.log('   Code:', error.code);
    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Check if the Gmail App Password is valid and not expired');
    console.log('   2. Ensure 2FA is enabled on your Gmail account');
    console.log('   3. Create a new App Password at: https://myaccount.google.com/apppasswords');
    console.log('   4. Check if firewall/antivirus is blocking port 587');
    console.log('   5. Try using port 465 with secure: true instead\n');
    
    console.log('💡 Alternative: Try using a different email service (like Mailtrap for testing)\n');
    process.exit(1);
  }
  
  console.log(`📤 Sending test OTP email to: ${testEmail}\n`);
  
  try {
    await emailService.sendOtpEmail(testEmail, '123456', 'Test User');
    console.log('\n✅ Email sent successfully!');
    console.log('   Check your inbox (and spam folder)');
  } catch (error) {
    console.log('\n❌ Email sending failed!');
    console.log('   Error:', error.message);
    console.log('\n🔍 Additional troubleshooting:');
    console.log('   1. The SMTP connection works but sending failed');
    console.log('   2. Check if the recipient email is valid');
    console.log('   3. Check Gmail sending limits (500 emails/day)');
    console.log('   4. Try sending from Gmail web interface to verify account status');
  }
  
  process.exit(0);
}

testEmail();

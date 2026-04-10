const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true', // false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // Gmail App Password
  },
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates
    ciphers: 'SSLv3', // Use compatible cipher
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 5000, // 5 seconds
  socketTimeout: 10000, // 10 seconds
  pool: true, // Use connection pooling
  maxConnections: 5,
  maxMessages: 100,
  logger: true, // Enable logging for debugging
  debug: process.env.NODE_ENV === 'development', // Enable debug in dev mode
});

// Verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error);
    console.error('❌ SMTP Settings:');
    console.error('   Host:', process.env.SMTP_HOST);
    console.error('   Port:', process.env.SMTP_PORT);
    console.error('   User:', process.env.SMTP_USER);
    console.error('   Secure:', process.env.SMTP_SECURE);
  } else {
    console.log('✅ Email server is ready to send messages');
    console.log('📧 SMTP Host:', process.env.SMTP_HOST);
    console.log('📧 SMTP Port:', process.env.SMTP_PORT);
  }
});

module.exports = transporter;

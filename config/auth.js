module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'your_super_secret_jwt_key',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10,
  otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS) || 5,
};

const crypto = require('crypto');
const prisma = require('../config/database');
const { otpExpiryMinutes, otpMaxAttempts } = require('../config/auth');

class OtpService {
  generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
  }

  async createOtp(userId, purpose = 'registration') {
    const otpCode = this.generateOtp();
    const expiresAt = new Date(Date.now() + otpExpiryMinutes * 60 * 1000);

    // Delete any existing OTPs for this user and purpose
    await prisma.otpVerification.deleteMany({
      where: { userId, purpose, verified: false },
    });

    // Create new OTP
    const otpRecord = await prisma.otpVerification.create({
      data: {
        userId,
        otpCode,
        purpose,
        expiresAt,
        attempts: 0,
        verified: false,
      },
    });

    return { otpCode, expiresAt, otpRecord };
  }

  async verifyOtp(userId, otpCode, purpose = 'registration') {
    // Find the OTP record
    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        userId,
        purpose,
        verified: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      return {
        success: false,
        error: 'No OTP found. Please request a new one.',
      };
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      return {
        success: false,
        error: 'OTP has expired. Please request a new one.',
        canResend: true,
      };
    }

    // Check max attempts
    if (otpRecord.attempts >= otpMaxAttempts) {
      return {
        success: false,
        error: 'Maximum verification attempts exceeded. Please request a new OTP.',
        canResend: true,
      };
    }

    // Verify OTP
    if (otpRecord.otpCode !== otpCode) {
      // Increment attempts
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });

      const remainingAttempts = otpMaxAttempts - (otpRecord.attempts + 1);

      return {
        success: false,
        error: 'Invalid OTP.',
        remainingAttempts,
        canResend: remainingAttempts === 0,
      };
    }

    // Mark as verified
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    return { success: true };
  }

  async canResendOtp(userId, purpose = 'registration') {
    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        userId,
        purpose,
        verified: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) return true;

    // Check if max attempts reached or expired
    return (
      otpRecord.attempts >= otpMaxAttempts ||
      new Date() > otpRecord.expiresAt
    );
  }
}

module.exports = new OtpService();

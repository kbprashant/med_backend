const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const doctorOtpService = require('../services/doctorOtpService');
const emailService = require('../services/emailService');

class DoctorAuthController {
  // Doctor Registration with Email OTP
  async register(req, res, next) {
    try {
      const {
        name,
        email,
        phoneNumber,
        password,
        specialization,
        hospital,
        clinicName,
        clinicAddress,
        profilePhoto
      } = req.body;

      // Validation
      if (!name || !email || !password || !specialization || !phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, phone number, password, and specialization are required'
        });
      }

      // Check if doctor already exists
      const existingDoctor = await prisma.doctor.findFirst({
        where: {
          OR: [
            { email: email },
            { phoneNumber: phoneNumber }
          ]
        }
      });

      if (existingDoctor) {
        if (existingDoctor.email === email) {
          return res.status(400).json({
            success: false,
            message: 'Doctor with this email already exists'
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Doctor with this phone number already exists'
        });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create doctor with isVerified = false
      const doctor = await prisma.doctor.create({
        data: {
          name,
          phoneNumber,
          email,
          passwordHash,
          specialization,
          hospital: hospital || null,
          clinicName: clinicName || null,
          clinicAddress: clinicAddress || null,
          profilePhoto: profilePhoto || null,
          isVerified: false
        }
      });

      // Generate OTP
      const { otpCode } = await doctorOtpService.createOtp(doctor.id, 'registration');

      // Send OTP email asynchronously
      emailService.sendDoctorOtpEmail(email, otpCode, name)
        .then(() => {
          console.log('✅ Doctor registration OTP email sent successfully to:', email);
        })
        .catch((emailError) => {
          console.error('❌ Failed to send doctor registration OTP email:', emailError);
        });

      return res.status(201).json({
        success: true,
        message: 'Registration initiated. Please verify your email with the OTP sent.',
        data: {
          doctorId: doctor.id,
          email: doctor.email
        }
      });

    } catch (error) {
      console.error('Error in doctor registration:', error);
      next(error);
    }
  }

  // Verify OTP for Doctor Registration
  async verifyOtp(req, res, next) {
    try {
      const { email, otpCode, purpose } = req.body;

      if (!email || !otpCode) {
        return res.status(400).json({
          success: false,
          message: 'Email and OTP code are required'
        });
      }

      // Find doctor by email
      const doctor = await prisma.doctor.findUnique({
        where: { email }
      });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found'
        });
      }

      // Determine purpose
      const otpPurpose = purpose || 'registration';

      // For registration OTPs, check if doctor is already verified
      if (otpPurpose === 'registration' && doctor.isVerified) {
        const token = jwt.sign(
          { 
            doctorId: doctor.id, 
            email: doctor.email,
            role: 'doctor'
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '7d' }
        );

        return res.json({
          success: true,
          message: 'Doctor already verified',
          data: {
            token,
            doctorId: doctor.id,
            name: doctor.name,
            email: doctor.email,
            phoneNumber: doctor.phoneNumber,
            specialization: doctor.specialization,
            hospital: doctor.hospital,
            clinicName: doctor.clinicName,
            clinicAddress: doctor.clinicAddress,
            profilePhoto: doctor.profilePhoto
          }
        });
      }

      // Verify OTP
      const verificationResult = await doctorOtpService.verifyOtp(
        doctor.id,
        otpCode,
        otpPurpose
      );

      if (!verificationResult.success) {
        return res.status(400).json({
          success: false,
          message: verificationResult.error,
          remainingAttempts: verificationResult.remainingAttempts,
          canResend: verificationResult.canResend
        });
      }

      // For registration, mark doctor as verified and send welcome email
      if (otpPurpose === 'registration') {
        await prisma.doctor.update({
          where: { id: doctor.id },
          data: { isVerified: true }
        });

        // Send registration success email
        emailService.sendDoctorRegistrationSuccessEmail(doctor.email, doctor.name)
          .catch((err) => console.error('Failed to send welcome email:', err));

        // Generate token
        const token = jwt.sign(
          { 
            doctorId: doctor.id, 
            email: doctor.email,
            role: 'doctor'
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '7d' }
        );

        return res.json({
          success: true,
          message: 'Email verified successfully!',
          data: {
            token,
            doctorId: doctor.id,
            name: doctor.name,
            email: doctor.email,
            phoneNumber: doctor.phoneNumber,
            specialization: doctor.specialization,
            hospital: doctor.hospital,
            clinicName: doctor.clinicName,
            clinicAddress: doctor.clinicAddress,
            profilePhoto: doctor.profilePhoto
          }
        });
      }

      // For password reset OTP
      return res.json({
        success: true,
        message: 'OTP verified successfully. You can now reset your password.'
      });

    } catch (error) {
      console.error('Error in doctor OTP verification:', error);
      next(error);
    }
  }

  // Resend OTP
  async resendOtp(req, res, next) {
    try {
      const { email, purpose } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const doctor = await prisma.doctor.findUnique({
        where: { email }
      });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found'
        });
      }

      const otpPurpose = purpose || 'registration';

      // Check if doctor is already verified (for registration purpose)
      if (otpPurpose === 'registration' && doctor.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'Doctor account already verified. Please login.'
        });
      }

      // Check if can resend
      const canResend = await doctorOtpService.canResendOtp(doctor.id, otpPurpose);
      if (!canResend) {
        return res.status(429).json({
          success: false,
          message: 'Please wait before requesting a new OTP'
        });
      }

      // Generate new OTP
      const { otpCode } = await doctorOtpService.createOtp(doctor.id, otpPurpose);

      // Send OTP email
      emailService.sendDoctorOtpEmail(email, otpCode, doctor.name)
        .then(() => {
          console.log('✅ Resend doctor OTP email sent successfully to:', email);
        })
        .catch((emailError) => {
          console.error('❌ Failed to resend doctor OTP email:', emailError);
        });

      return res.json({
        success: true,
        message: 'OTP has been resent to your email'
      });

    } catch (error) {
      console.error('Error in resending doctor OTP:', error);
      next(error);
    }
  }

  // Doctor Login (only if verified)
  async login(req, res, next) {
    try {
      const { phoneNumber, password } = req.body;

      // Validation
      if (!phoneNumber || !password) {
        return res.status(400).json({
          success: false,
          message: 'Phone number and password are required'
        });
      }

      // Find doctor by phone number
      const doctor = await prisma.doctor.findUnique({
        where: { phoneNumber }
      });

      if (!doctor) {
        return res.status(401).json({
          success: false,
          message: 'Invalid phone number or password'
        });
      }

      // Check if doctor is verified
      if (!doctor.isVerified) {
        return res.status(403).json({
          success: false,
          message: 'Your account is not verified. Please verify your email first.',
          needsVerification: true,
          email: doctor.email
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, doctor.passwordHash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid phone number or password'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          doctorId: doctor.id, 
          email: doctor.email,
          phoneNumber: doctor.phoneNumber,
          role: 'doctor'
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          doctorId: doctor.id,
          name: doctor.name,
          email: doctor.email,
          phoneNumber: doctor.phoneNumber,
          specialization: doctor.specialization,
          hospital: doctor.hospital,
          clinicName: doctor.clinicName,
          clinicAddress: doctor.clinicAddress,
          profilePhoto: doctor.profilePhoto
        }
      });

    } catch (error) {
      console.error('Error in doctor login:', error);
      next(error);
    }
  }

  // Forgot Password - Send OTP
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const doctor = await prisma.doctor.findUnique({
        where: { email }
      });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'No doctor account found with this email'
        });
      }

      // Generate OTP for password reset
      const { otpCode } = await doctorOtpService.createOtp(doctor.id, 'password_reset');

      // Send OTP email
      emailService.sendDoctorOtpEmail(email, otpCode, doctor.name)
        .then(() => {
          console.log('✅ Password reset OTP sent to:', email);
        })
        .catch((err) => {
          console.error('❌ Failed to send password reset OTP:', err);
        });

      return res.json({
        success: true,
        message: 'OTP has been sent to your email for password reset'
      });

    } catch (error) {
      console.error('Error in forgot password:', error);
      next(error);
    }
  }

  // Reset Password
  async resetPassword(req, res, next) {
    try {
      const { email, otpCode, newPassword } = req.body;

      if (!email || !otpCode || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Email, OTP code, and new password are required'
        });
      }

      if (newPassword.length > 4) {
        return res.status(400).json({
          success: false,
          message: 'Password cannot exceed 4 characters'
        });
      }

      const doctor = await prisma.doctor.findUnique({
        where: { email }
      });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found'
        });
      }

      // Verify OTP for password reset
      const verificationResult = await doctorOtpService.verifyOtp(
        doctor.id,
        otpCode,
        'password_reset'
      );

      if (!verificationResult.success) {
        return res.status(400).json({
          success: false,
          message: verificationResult.error
        });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.doctor.update({
        where: { id: doctor.id },
        data: { passwordHash }
      });

      return res.json({
        success: true,
        message: 'Password has been reset successfully. You can now login with your new password.'
      });

    } catch (error) {
      console.error('Error in reset password:', error);
      next(error);
    }
  }
}

module.exports = new DoctorAuthController();

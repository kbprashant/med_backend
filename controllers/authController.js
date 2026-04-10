const bcrypt = require('bcrypt');
const prisma = require('../config/database');
const jwtService = require('../services/jwtService');
const otpService = require('../services/otpService');
const emailService = require('../services/emailService');

class AuthController {
  // Register new user
  async register(req, res, next) {
    try {
      const { name, email, phoneNumber, password } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { phoneNumber }],
        },
      });

      if (existingUser) {
        if (existingUser.email === email) {
          return res.status(400).json({ error: 'Email already registered' });
        }
        return res.status(400).json({ error: 'Phone number already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          phoneNumber,
          passwordHash,
          isVerified: false,
        },
      });

      // Generate OTP
      const { otpCode } = await otpService.createOtp(user.id, 'registration');

      // Send OTP email asynchronously (fire-and-forget)
      emailService.sendOtpEmail(email, otpCode, name)
        .then(() => {
          console.log('✅ Registration OTP email sent successfully to:', email);
        })
        .catch((emailError) => {
          console.error('❌ Failed to send registration OTP email:', emailError);
        });

      res.status(201).json({
        message: 'Registration initiated. Please verify your email with the OTP sent.',
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify OTP
  async verifyOtp(req, res, next) {
    try {
      const { email, otpCode, purpose } = req.body;

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Determine purpose - default to 'registration' for backward compatibility
      const otpPurpose = purpose || 'registration';

      // For registration OTPs, check if user is already verified
      if (otpPurpose === 'registration' && user.isVerified) {
        // User already verified, generate token and return success
        const token = jwtService.generateToken({
          id: user.id,
          email: user.email,
          phoneNumber: user.phoneNumber,
        });
        
        return res.json({
          message: 'User already verified',
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            profileImage: user.profileImage,
          },
        });
      }

      // Verify OTP with the specified purpose
      const result = await otpService.verifyOtp(user.id, otpCode, otpPurpose);

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          remainingAttempts: result.remainingAttempts,
          canResend: result.canResend,
        });
      }

      // Handle registration OTP verification
      if (otpPurpose === 'registration') {
        // Mark user as verified
        await prisma.user.update({
          where: { id: user.id },
          data: { isVerified: true },
        });

        // Send registration success email
        await emailService.sendRegistrationSuccessEmail(user.email, user.name);

        // Generate JWT token
        const token = jwtService.generateToken({
          id: user.id,
          email: user.email,
          phoneNumber: user.phoneNumber,
        });

        return res.json({
          message: 'Email verified successfully',
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            profileImage: user.profileImage,
          },
        });
      }

      // Handle password reset OTP verification
      if (otpPurpose === 'password_reset') {
        return res.json({
          message: 'OTP verified successfully. You can now reset your password.',
        });
      }

      // Default response for other purposes
      res.json({
        message: 'OTP verified successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Resend OTP
  async resendOtp(req, res, next) {
    try {
      const { email, purpose } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Determine purpose - default to 'registration' for backward compatibility
      const otpPurpose = purpose || 'registration';

      // For registration OTPs, check if user is already verified
      if (otpPurpose === 'registration' && user.isVerified) {
        return res.status(400).json({ error: 'Your account is already verified. Please login.' });
      }

      // Check if can resend
      const canResend = await otpService.canResendOtp(user.id, otpPurpose);
      if (!canResend) {
        return res.status(400).json({
          error: 'Please wait before requesting a new OTP',
        });
      }

      // Generate new OTP
      const { otpCode } = await otpService.createOtp(user.id, otpPurpose);

      // Send OTP email asynchronously (fire-and-forget)
      emailService.sendOtpEmail(email, otpCode, user.name)
        .then(() => {
          console.log('✅ Resend OTP email sent successfully to:', email);
        })
        .catch((emailError) => {
          console.error('❌ Failed to resend OTP email:', emailError);
        });

      res.json({ message: 'New OTP sent to your email' });
    } catch (error) {
      next(error);
    }
  }

  // Login
  async login(req, res, next) {
    try {
      const { phoneNumber, password } = req.body;

      // Find user by phone number
      const user = await prisma.user.findUnique({
        where: { phoneNumber },
      });

      if (!user) {
        return res.status(404).json({ error: 'Mobile number not registered' });
      }

      // Check if verified
      if (!user.isVerified) {
        return res.status(403).json({
          error: 'Email not verified. Please verify your email first.',
          email: user.email,
        });
      }

      // Compare password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Incorrect password. Please try again.' });
      }

      // Generate JWT token
      const token = jwtService.generateToken({
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
      });

      res.json({
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            profileImage: user.profileImage,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Forgot Password - Send OTP
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      console.log('🔐 Forgot Password Request for:', email);

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        console.log('❌ User not found for email:', email);
        // Don't reveal if user exists for security
        return res.json({
          message: 'If the email exists, an OTP has been sent',
        });
      }

      console.log('✅ User found, generating OTP for userId:', user.id);

      // Generate OTP and save to database first
      const { otpCode, otpRecord } = await otpService.createOtp(user.id, 'password_reset');

      console.log('✅ OTP created successfully in database:', {
        otpId: otpRecord.id,
        purpose: otpRecord.purpose,
        userId: otpRecord.userId,
        otpCode: otpCode,
      });

      // Send OTP email after database operation completes
      // Use fire-and-forget pattern to avoid blocking
      emailService.sendOtpEmail(email, otpCode, user.name)
        .then(() => {
          console.log('✅ Password reset OTP email sent successfully to:', email);
        })
        .catch((emailError) => {
          console.error('❌ Failed to send OTP email:', emailError);
          // Don't fail the request if email fails - OTP is already saved
        });

      // Return immediately after OTP is saved, don't wait for email
      res.json({
        message: 'If the email exists, an OTP has been sent',
      });
    } catch (error) {
      console.error('❌ Error in forgotPassword:', error);
      next(error);
    }
  }

  // Reset Password
  async resetPassword(req, res, next) {
    try {
      const { email, otpCode, newPassword } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if a valid verified OTP exists
      const verifiedOtp = await prisma.otpVerification.findFirst({
        where: {
          userId: user.id,
          purpose: 'password_reset',
          verified: true,
          otpCode: otpCode,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!verifiedOtp) {
        return res.status(400).json({
          error: 'OTP verification expired or invalid. Please request a new OTP.',
        });
      }

      // Check if the OTP was verified recently (within 15 minutes of creation)
      const timeSinceCreation = Date.now() - verifiedOtp.createdAt.getTime();
      const fifteenMinutes = 15 * 60 * 1000;
      
      if (timeSinceCreation > fifteenMinutes) {
        return res.status(400).json({
          error: 'OTP verification session expired. Please request a new OTP.',
        });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
      
      // Delete the used OTP
      await prisma.otpVerification.delete({
        where: { id: verifiedOtp.id },
      });

      // Send password changed email
      await emailService.sendPasswordChangedEmail(user.email, user.name);

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      next(error);
    }
  }

  // Get current user profile
  async getProfile(req, res, next) {
    try {
      // Debug: Check if user is attached to request
      if (!req.user || !req.user.id) {
        console.error('❌ Authentication Error: req.user is missing or incomplete', {
          user: req.user,
          headers: req.headers.authorization ? 'Present' : 'Missing'
        });
        return res.status(401).json({ 
          error: 'Unauthorized: User information not found in token' 
        });
      }

      // Check if this is a doctor or patient token
      const isDoctor = req.user.role === 'doctor' || req.user.doctorId;

      let profile;

      if (isDoctor) {
        // Query doctors table
        profile = await prisma.doctor.findUnique({
          where: { id: req.user.id },
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            specialization: true,
            hospital: true,
            clinicName: true,
            clinicAddress: true,
            profilePhoto: true,
            isVerified: true,
            createdAt: true,
          },
        });
      } else {
        // Query users table (patients)
        profile = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profileImage: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true,
            address: true,
            medicalHistory: true,
            currentMedicines: true,
            isVerified: true,
            createdAt: true,
          },
        });
      }

      if (!profile) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: profile });
    } catch (error) {
      next(error);
    }
  }

  // Update user profile
  async updateProfile(req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          error: 'Unauthorized: User information not found in token' 
        });
      }

      const userId = req.user.id;
      const {
        name,
        profileImage,
        dateOfBirth,
        gender,
        bloodGroup,
        address,
        medicalHistory,
        currentMedicines,
      } = req.body;

      // Build update data object (only include provided fields)
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (profileImage !== undefined) updateData.profileImage = profileImage;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dateOfBirth);
      if (gender !== undefined) updateData.gender = gender;
      if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup;
      if (address !== undefined) updateData.address = address;
      if (medicalHistory !== undefined) updateData.medicalHistory = medicalHistory;
      if (currentMedicines !== undefined) updateData.currentMedicines = currentMedicines;

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profileImage: true,
          dateOfBirth: true,
          gender: true,
          bloodGroup: true,
          address: true,
          medicalHistory: true,
          currentMedicines: true,
          isVerified: true,
          createdAt: true,
        },
      });

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  // Change Phone Number with Password Verification
  async changePhoneNumber(req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          error: 'Unauthorized: User information not found in token' 
        });
      }

      const userId = req.user.id;
      const { newPhoneNumber, password } = req.body;

      // Get current user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        return res.status(401).json({ 
          error: 'Incorrect password. Please try again.' 
        });
      }

      // Check if new phone number is already in use
      const existingUser = await prisma.user.findUnique({
        where: { phoneNumber: newPhoneNumber },
      });

      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ 
          error: 'Phone number already registered to another account' 
        });
      }

      // Update phone number
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { phoneNumber: newPhoneNumber },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          profileImage: true,
          dateOfBirth: true,
          gender: true,
          bloodGroup: true,
          address: true,
          medicalHistory: true,
          currentMedicines: true,
          isVerified: true,
          createdAt: true,
        },
      });

      res.json({
        message: 'Phone number updated successfully. Please use your new phone number for future logins.',
        user: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();

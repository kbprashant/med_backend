const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');
const {
  validate,
  registerValidation,
  loginValidation,
  verifyOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePhoneNumberValidation,
} = require('../middleware/validator');

// Public routes
router.post('/register', validate(registerValidation), authController.register);
router.post('/verify-otp', validate(verifyOtpValidation), authController.verifyOtp);
router.post('/resend-otp', validate(forgotPasswordValidation), authController.resendOtp);
router.post('/login', validate(loginValidation), authController.login);
router.post('/forgot-password', validate(forgotPasswordValidation), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordValidation), authController.resetPassword);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.get('/me', authenticate, authController.getProfile); // Alias for profile
router.put('/profile', authenticate, authController.updateProfile);
router.post('/change-phone-number', authenticate, validate(changePhoneNumberValidation), authController.changePhoneNumber);

module.exports = router;

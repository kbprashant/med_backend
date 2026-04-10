const express = require('express');
const router = express.Router();
const doctorAuthController = require('../controllers/doctorAuthController');

// Doctor Authentication Routes
router.post('/register', doctorAuthController.register);
router.post('/verify-otp', doctorAuthController.verifyOtp);
router.post('/resend-otp', doctorAuthController.resendOtp);
router.post('/login', doctorAuthController.login);
router.post('/forgot-password', doctorAuthController.forgotPassword);
router.post('/reset-password', doctorAuthController.resetPassword);

module.exports = router;

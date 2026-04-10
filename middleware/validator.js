const { body, validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    for (let validation of validations) {
      const result = await validation.run(req);
      if (!result.isEmpty()) break;
    }

    // Check for errors
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Return validation errors
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  };
};

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phoneNumber')
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  body('password')
    .isLength({ max: 4 })
    .withMessage('Password cannot exceed 4 characters'),
];

const loginValidation = [
  body('phoneNumber')
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  body('password').notEmpty().withMessage('Password is required'),
];

const verifyOtpValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otpCode')
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage('OTP must be 6 digits'),
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
];

const resetPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otpCode')
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage('OTP must be 6 digits'),
  body('newPassword')
    .isLength({ max: 4 })
    .withMessage('Password cannot exceed 4 characters'),
];

const reportValidation = [
  body('testType').trim().notEmpty().withMessage('Test type is required'),
  body('reportDate').isISO8601().withMessage('Valid date is required'),
  body('testResults').isArray().withMessage('Test results must be an array'),
  body('testResults.*.testName').optional().notEmpty().withMessage('Test name is required'),
  body('testResults.*.parameterName').optional().notEmpty().withMessage('Parameter name is required'),
  body('testResults.*.value').optional().notEmpty().withMessage('Value is required'),
  body('testResults.*.status')
    .optional()
    .isIn(['NORMAL', 'HIGH', 'LOW'])
    .withMessage('Status must be NORMAL, HIGH, or LOW'),
];

const changePhoneNumberValidation = [
  body('newPhoneNumber')
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  verifyOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  reportValidation,
  changePhoneNumberValidation,
};

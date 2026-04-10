/**
 * Validate email format
 */
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Validate phone number (10 digits)
 */
function isValidPhoneNumber(phoneNumber) {
  const regex = /^[0-9]{10}$/;
  return regex.test(phoneNumber);
}

/**
 * Validate password strength
 */
function validatePassword(password) {
  const errors = [];

  if (password.length < 1) {
    errors.push('Password is required');
  }

  if (password.length > 4) {
    errors.push('Password cannot exceed 4 characters');
  }

  // Optional: Add more strength checks
  // if (!/[A-Z]/.test(password)) {
  //   errors.push('Password must contain at least one uppercase letter');
  // }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize string input
 */
function sanitizeString(str) {
  if (!str) return '';
  return str.trim().replace(/[<>]/g, '');
}

module.exports = {
  isValidEmail,
  isValidPhoneNumber,
  validatePassword,
  sanitizeString,
};
